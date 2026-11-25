<?php
/**
 * 设置：代理核心 /wp/v2/settings，并提供插件自身连接设置。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FOHOK_Endpoint_Settings extends WP_REST_Controller {

	public function register_routes() {
		$ns = 'fohok/v1';
		$admin = function () {
			return current_user_can( 'manage_options' );
		};

		register_rest_route( $ns, '/settings/core', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_core' ),
				'permission_callback' => $admin,
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_core' ),
				'permission_callback' => $admin,
			),
		) );

		register_rest_route( $ns, '/settings/bridge', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'bridge' ),
				'permission_callback' => $admin,
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_bridge' ),
				'permission_callback' => $admin,
			),
		) );

		register_rest_route( $ns, '/settings/bridge/token', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'regenerate_token' ),
			'permission_callback' => $admin,
		) );
	}

	private function proxy( $method, $params = array() ) {
		$request = new WP_REST_Request( $method, '/wp/v2/settings' );
		if ( 'POST' === $method || 'PUT' === $method ) {
			$request->set_body_params( $params );
		} else {
			$request->set_query_params( $params );
		}
		$response = rest_do_request( $request );
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		return rest_ensure_response( $response->get_data() );
	}

	public function get_core() {
		return $this->proxy( 'GET' );
	}

	public function save_core( $request ) {
		return $this->proxy( 'POST', $request->get_body_params() );
	}

	public function bridge() {
		return rest_ensure_response( array(
			'version'         => FOHOK_BRIDGE_VERSION,
			'token_configured'=> (bool) get_option( 'fohok_bridge_token_hash' ),
			'token_user'      => (int) get_option( 'fohok_bridge_token_user' ),
			'allowed_origins' => get_option( 'fohok_bridge_allowed_origins', '*' ),
			'features'        => (array) get_option( 'fohok_bridge_enabled_features', array() ),
			'token_url'       => admin_url( 'options-general.php?page=fohok-bridge' ),
		) );
	}

	public function save_bridge( $request ) {
		if ( isset( $request['allowed_origins'] ) ) {
			$raw = is_array( $request['allowed_origins'] ) ? $request['allowed_origins'] : preg_split( '/\r?\n/', (string) $request['allowed_origins'] );
			$lines = array_filter( array_map( 'trim', (array) $raw ) );
			update_option( 'fohok_bridge_allowed_origins', empty( $lines ) ? '*' : array_values( $lines ) );
		}
		if ( isset( $request['features'] ) && is_array( $request['features'] ) ) {
			update_option( 'fohok_bridge_enabled_features', array_values( array_map( 'sanitize_key', $request['features'] ) ) );
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}

	public function regenerate_token() {
		$token = FOHOK_Bridge::instance()->generate_token();
		if ( ! $token ) {
			return new WP_Error( 'token_failed', '密钥生成失败', array( 'status' => 500 ) );
		}
		return rest_ensure_response( array(
			'ok'    => true,
			'token' => $token,
			'note'  => '密钥仅显示一次，请立即保存到 APP。',
		) );
	}
}

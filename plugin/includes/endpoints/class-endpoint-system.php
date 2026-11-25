<?php
/**
 * 鉴权 / 站点信息 / 站点健康 / 角色。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FOHOK_Endpoint_System extends WP_REST_Controller {

	public function register_routes() {
		$ns = 'fohok/v1';

		register_rest_route( $ns, '/auth/verify', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'verify' ),
			'permission_callback' => array( $this, 'logged_in' ),
		) );

		register_rest_route( $ns, '/site/info', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'site_info' ),
			'permission_callback' => array( $this, 'logged_in' ),
		) );

		register_rest_route( $ns, '/site/health', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'health' ),
			'permission_callback' => function () {
				return current_user_can( 'manage_options' );
			},
		) );

		register_rest_route( $ns, '/system/roles', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'roles' ),
			'permission_callback' => array( $this, 'logged_in' ),
		) );
	}

	public function logged_in() {
		return is_user_logged_in();
	}

	public function verify() {
		$user = wp_get_current_user();
		$caps = array();
		foreach ( (array) $user->allcaps as $cap => $allowed ) {
			if ( $allowed ) {
				$caps[] = $cap;
			}
		}
		return rest_ensure_response( array(
			'user' => array(
				'id'           => $user->ID,
				'name'         => $user->display_name,
				'slug'         => $user->user_login,
				'email'        => $user->user_email,
				'roles'        => (array) $user->roles,
				'capabilities' => $caps,
			),
			'site' => $this->site_payload(),
			'plugin' => array(
				'version' => FOHOK_BRIDGE_VERSION,
				'api'     => rest_url( 'fohok/v1' ),
			),
			'features' => (array) get_option( 'fohok_bridge_enabled_features', array() ),
		) );
	}

	public function site_info() {
		return rest_ensure_response( $this->site_payload() );
	}

	private function site_payload() {
		require_once ABSPATH . 'wp-admin/includes/update.php';

		$posts      = (array) wp_count_posts( 'post' );
		$pages      = (array) wp_count_posts( 'page' );
		$media      = (array) wp_count_posts( 'attachment' );
		$comments   = (array) wp_count_comments();
		$user_data  = count_users();
		$updates    = wp_get_update_data();
		$theme      = wp_get_theme();

		return array(
			'name'        => get_bloginfo( 'name' ),
			'description' => get_bloginfo( 'description' ),
			'url'         => home_url( '/' ),
			'admin_url'   => admin_url(),
			'wp_version'  => get_bloginfo( 'version' ),
			'locale'      => get_locale(),
			'timezone'    => wp_timezone_string(),
			'active_theme'=> $theme->get( 'Name' ),
			'permalink'   => get_option( 'permalink_structure' ),
			'counts'      => array(
				'posts'    => array_sum( $posts ),
				'pages'    => array_sum( $pages ),
				'media'    => array_sum( $media ),
				'comments' => array_sum( $comments ),
				'users'    => isset( $user_data['total_users'] ) ? $user_data['total_users'] : 0,
			),
			'updates'     => array(
				'core'    => isset( $updates['counts']['wordpress'] ) ? (int) $updates['counts']['wordpress'] : 0,
				'plugins' => isset( $updates['counts']['plugins'] ) ? (int) $updates['counts']['plugins'] : 0,
				'themes'  => isset( $updates['counts']['themes'] ) ? (int) $updates['counts']['themes'] : 0,
				'total'   => isset( $updates['counts']['total'] ) ? (int) $updates['counts']['total'] : 0,
			),
		);
	}

	public function health() {
		require_once ABSPATH . 'wp-admin/includes/class-wp-site-health.php';
		$health = new WP_Site_Health();
		$tests  = $health->get_tests();
		$items  = array();
		foreach ( (array) $tests as $key => $test ) {
			$items[] = array(
				'key'         => $key,
				'label'       => isset( $test['label'] ) ? wp_strip_all_tags( $test['label'] ) : $key,
				'status'      => isset( $test['status'] ) ? $test['status'] : 'good',
				'badge'       => isset( $test['badge'] ) ? $test['badge'] : '',
				'description' => isset( $test['description'] ) ? wp_strip_all_tags( $test['description'] ) : '',
			);
		}
		return rest_ensure_response( array( 'tests' => $items ) );
	}

	public function roles() {
		$roles  = wp_roles();
		$result = array();
		foreach ( $roles->get_names() as $slug => $name ) {
			$caps = isset( $roles->roles[ $slug ]['capabilities'] ) ? $roles->roles[ $slug ]['capabilities'] : array();
			$enabled = array();
			foreach ( $caps as $cap => $allowed ) {
				if ( $allowed ) {
					$enabled[] = $cap;
				}
			}
			$result[] = array( 'slug' => $slug, 'name' => $name, 'capabilities' => $enabled );
		}
		return rest_ensure_response( $result );
	}
}

<?php
/**
 * 插件 / 主题 / 更新管理。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FOHOK_Endpoint_Extensions extends WP_REST_Controller {

	public function register_routes() {
		$ns = 'fohok/v1';

		register_rest_route( $ns, '/plugins', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'plugins' ),
			'permission_callback' => function () {
				return current_user_can( 'activate_plugins' );
			},
		) );

		register_rest_route( $ns, '/plugins/install', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'install_plugin' ),
			'permission_callback' => function () {
				return current_user_can( 'install_plugins' );
			},
			'args'                => array(
				'slug' => array( 'required' => true, 'type' => 'string' ),
			),
		) );

		register_rest_route( $ns, '/plugins/(?P<slug>[^/]+)/(?P<action>activate|deactivate|update|delete)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'plugin_action' ),
			'permission_callback' => function ( $request ) {
				$action = $request['action'];
				$cap = 'activate_plugins';
				if ( 'update' === $action ) {
					$cap = 'update_plugins';
				} elseif ( 'delete' === $action ) {
					$cap = 'delete_plugins';
				}
				return current_user_can( $cap );
			},
		) );

		register_rest_route( $ns, '/themes', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'themes' ),
			'permission_callback' => function () {
				return current_user_can( 'switch_themes' );
			},
		) );

		register_rest_route( $ns, '/themes/(?P<slug>[^/]+)/(?P<action>activate|update|delete)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'theme_action' ),
			'permission_callback' => function ( $request ) {
				$action = $request['action'];
				$cap = 'switch_themes';
				if ( 'update' === $action ) {
					$cap = 'update_themes';
				} elseif ( 'delete' === $action ) {
					$cap = 'delete_themes';
				}
				return current_user_can( $cap );
			},
		) );

		register_rest_route( $ns, '/updates', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'updates' ),
			'permission_callback' => function () {
				return current_user_can( 'update_plugins' ) || current_user_can( 'update_core' );
			},
		) );

		register_rest_route( $ns, '/updates/(?P<type>core|plugins|themes)', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'run_update' ),
			'permission_callback' => function ( $request ) {
				$type = $request['type'];
				$cap = 'plugins' === $type ? 'update_plugins' : ( 'themes' === $type ? 'update_themes' : 'update_core' );
				return current_user_can( $cap );
			},
		) );
	}

	private function load_admin_includes() {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
		require_once ABSPATH . 'wp-admin/includes/theme.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/update.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader-skin.php';
		require_once ABSPATH . 'wp-admin/includes/class-wp-ajax-upgrader-skin.php';
		WP_Filesystem();
	}

	private function upgrader( $class ) {
		$this->load_admin_includes();
		$skin = new WP_Ajax_Upgrader_Skin();
		return new $class( $skin );
	}

	private function find_plugin_file( $slug ) {
		$this->load_admin_includes();
		$slug = sanitize_key( $slug );
		foreach ( array_keys( get_plugins() ) as $file ) {
			if ( 0 === strpos( $file, $slug . '/' ) || basename( $file, '.php' ) === $slug ) {
				return $file;
			}
		}
		return '';
	}

	private function find_theme_slug( $slug ) {
		$this->load_admin_includes();
		$slug = sanitize_key( $slug );
		foreach ( wp_get_themes() as $theme ) {
			if ( $theme->get_stylesheet() === $slug ) {
				return $slug;
			}
		}
		return '';
	}

	public function plugins() {
		$this->load_admin_includes();
		$update_data = get_site_transient( 'update_plugins' );
		$updates = isset( $update_data->response ) ? (array) $update_data->response : array();
		$items = array();
		foreach ( get_plugins() as $file => $data ) {
			$network = is_multisite() && is_plugin_active_for_network( $file );
			$items[] = array(
				'slug'         => basename( dirname( $file ) ) === '.' ? basename( $file, '.php' ) : basename( dirname( $file ) ),
				'file'         => $file,
				'name'         => $data['Name'],
				'version'      => $data['Version'],
				'description'  => wp_strip_all_tags( $data['Description'] ),
				'author'       => wp_strip_all_tags( $data['Author'] ),
				'active'       => is_plugin_active( $file ) || $network,
				'network'      => $network,
				'update'       => isset( $updates[ $file ]->new_version ) ? $updates[ $file ]->new_version : null,
				'requires_wp'  => isset( $data['RequiresWP'] ) ? $data['RequiresWP'] : '',
				'requires_php' => isset( $data['RequiresPHP'] ) ? $data['RequiresPHP'] : '',
			);
		}
		return rest_ensure_response( array( 'items' => array_values( $items ) ) );
	}

	public function plugin_action( $request ) {
		$slug   = (string) $request['slug'];
		$action = (string) $request['action'];
		$file   = $this->find_plugin_file( $slug );
		if ( ! $file ) {
			return new WP_Error( 'not_found', '未找到插件：' . $slug, array( 'status' => 404 ) );
		}
		$network = ! empty( $request['network'] );

		if ( 'activate' === $action ) {
			$this->load_admin_includes();
			$result = activate_plugin( $file, '', $network, false );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return rest_ensure_response( array( 'ok' => true, 'action' => $action ) );
		}
		if ( 'deactivate' === $action ) {
			$this->load_admin_includes();
			deactivate_plugins( $file, false, $network );
			return rest_ensure_response( array( 'ok' => true, 'action' => $action ) );
		}
		if ( 'update' === $action ) {
			$upgrader = $this->upgrader( 'Plugin_Upgrader' );
			$result = $upgrader->upgrade( $file );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return rest_ensure_response( array( 'ok' => true, 'action' => $action ) );
		}
		if ( 'delete' === $action ) {
			$this->load_admin_includes();
			$result = delete_plugins( array( $file ) );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return rest_ensure_response( array( 'ok' => true, 'action' => $action ) );
		}
		return new WP_Error( 'invalid_action', '不支持的操作', array( 'status' => 400 ) );
	}

	public function install_plugin( $request ) {
		$slug = sanitize_key( $request['slug'] );
		$upgrader = $this->upgrader( 'Plugin_Upgrader' );
		$result = $upgrader->install( 'https://downloads.wordpress.org/plugin/' . $slug . '.zip' );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( array( 'ok' => true, 'slug' => $slug ) );
	}

	public function themes() {
		$this->load_admin_includes();
		$current  = wp_get_theme();
		$update_data = get_site_transient( 'update_themes' );
		$updates = isset( $update_data->response ) ? (array) $update_data->response : array();
		$items = array();
		foreach ( wp_get_themes() as $theme ) {
			$slug = $theme->get_stylesheet();
			$items[] = array(
				'slug'        => $slug,
				'name'        => $theme->get( 'Name' ),
				'version'     => $theme->get( 'Version' ),
				'description' => wp_strip_all_tags( $theme->get( 'Description' ) ),
				'author'      => wp_strip_all_tags( $theme->get( 'Author' ) ),
				'active'      => $current->get_stylesheet() === $slug,
				'update'      => isset( $updates[ $slug ]['new_version'] ) ? $updates[ $slug ]['new_version'] : null,
			);
		}
		return rest_ensure_response( array( 'items' => $items, 'current' => $current->get( 'Name' ) ) );
	}

	public function theme_action( $request ) {
		$slug = $this->find_theme_slug( (string) $request['slug'] );
		if ( ! $slug ) {
			return new WP_Error( 'not_found', '未找到主题', array( 'status' => 404 ) );
		}
		$action = (string) $request['action'];
		$this->load_admin_includes();
		if ( 'activate' === $action ) {
			switch_theme( $slug );
			return rest_ensure_response( array( 'ok' => true ) );
		}
		if ( 'delete' === $action ) {
			$result = delete_theme( $slug );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return rest_ensure_response( array( 'ok' => true ) );
		}
		if ( 'update' === $action ) {
			$upgrader = $this->upgrader( 'Theme_Upgrader' );
			$result = $upgrader->upgrade( $slug );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return rest_ensure_response( array( 'ok' => true ) );
		}
		return new WP_Error( 'invalid_action', '不支持的操作', array( 'status' => 400 ) );
	}

	public function updates() {
		$this->load_admin_includes();
		$core = get_site_transient( 'update_core' );
		$core_updates = array();
		if ( $core && ! empty( $core->updates ) ) {
			foreach ( $core->updates as $item ) {
				if ( 'upgrade' === $item->response ) {
					$core_updates[] = array(
						'version' => $item->version,
						'package' => isset( $item->package ) ? $item->package : '',
					);
				}
			}
		}
		$plugins = get_site_transient( 'update_plugins' );
		$themes = get_site_transient( 'update_themes' );
		return rest_ensure_response( array(
			'core'    => $core_updates,
			'plugins' => isset( $plugins->response ) ? array_keys( (array) $plugins->response ) : array(),
			'themes'  => isset( $themes->response ) ? array_keys( (array) $themes->response ) : array(),
		) );
	}

	public function run_update( $request ) {
		$type = (string) $request['type'];
		$this->load_admin_includes();
		if ( 'core' === $type ) {
			$core = get_site_transient( 'update_core' );
			if ( ! $core || empty( $core->updates ) ) {
				return new WP_Error( 'no_update', '没有可用的核心更新', array( 'status' => 404 ) );
			}
			foreach ( $core->updates as $item ) {
				if ( 'upgrade' === $item->response ) {
					$upgrader = $this->upgrader( 'Core_Upgrader' );
					$result = $upgrader->upgrade( $item );
					if ( is_wp_error( $result ) ) {
						return $result;
					}
					return rest_ensure_response( array( 'ok' => true, 'type' => 'core' ) );
				}
			}
			return new WP_Error( 'no_update', '没有可用的核心更新', array( 'status' => 404 ) );
		}
		$class = 'plugins' === $type ? 'Plugin_Upgrader' : 'Theme_Upgrader';
		$transient = 'plugins' === $type ? get_site_transient( 'update_plugins' ) : get_site_transient( 'update_themes' );
		$items = isset( $transient->response ) ? array_keys( (array) $transient->response ) : array();
		if ( empty( $items ) ) {
			return new WP_Error( 'no_update', '没有可用更新', array( 'status' => 404 ) );
		}
		$upgrader = $this->upgrader( $class );
		$result = $upgrader->bulk_upgrade( $items );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( array( 'ok' => true, 'type' => $type, 'updated' => count( $items ) ) );
	}
}

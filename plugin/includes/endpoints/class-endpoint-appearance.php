<?php
/**
 * 菜单与小工具管理（核心 REST API 未提供）。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class FOHOK_Endpoint_Appearance extends WP_REST_Controller {

	public function register_routes() {
		$ns = 'fohok/v1';
		$can_edit = function () {
			return current_user_can( 'edit_theme_options' );
		};

		register_rest_route( $ns, '/menus/locations', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'locations' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/menus', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'menus' ),
				'permission_callback' => $can_edit,
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'create_menu' ),
				'permission_callback' => $can_edit,
				'args'                => array( 'name' => array( 'required' => true ) ),
			),
		) );

		register_rest_route( $ns, '/menus/(?P<id>\d+)', array(
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'menu' ),
				'permission_callback' => $can_edit,
			),
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'update_menu' ),
				'permission_callback' => $can_edit,
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'delete_menu' ),
				'permission_callback' => $can_edit,
			),
		) );

		register_rest_route( $ns, '/menus/(?P<id>\d+)/items', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'add_item' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/menus/(?P<id>\d+)/items/(?P<item>\d+)', array(
			'methods'             => 'DELETE',
			'callback'            => array( $this, 'delete_item' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/menus/(?P<id>\d+)/locations', array(
			'methods'             => 'POST',
			'callback'            => array( $this, 'assign_location' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/widgets', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'widgets' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/widgets/sidebars', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'sidebars' ),
			'permission_callback' => $can_edit,
		) );

		register_rest_route( $ns, '/widgets/sidebars/(?P<id>[a-zA-Z0-9_-]+)', array(
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'save_sidebar' ),
				'permission_callback' => $can_edit,
			),
			array(
				'methods'             => 'DELETE',
				'callback'            => array( $this, 'remove_from_sidebar' ),
				'permission_callback' => $can_edit,
			),
		) );
	}

	private function load_menu_includes() {
		require_once ABSPATH . 'wp-admin/includes/nav-menu.php';
	}

	private function menu_item_payload( $item ) {
		return array(
			'id'        => (int) $item->ID,
			'title'     => $item->title,
			'url'       => $item->url,
			'type'      => $item->type,
			'object'    => $item->object,
			'object_id' => (int) $item->object_id,
			'parent'    => (int) $item->menu_item_parent,
			'order'     => (int) $item->menu_order,
		);
	}

	public function menus() {
		$this->load_menu_includes();
		$result = array();
		foreach ( wp_get_nav_menus() as $menu ) {
			$items = wp_get_nav_menu_items( $menu->term_id );
			$result[] = array(
				'id'    => (int) $menu->term_id,
				'name'  => $menu->name,
				'slug'  => $menu->slug,
				'count' => count( (array) $items ),
				'items' => array_map( array( $this, 'menu_item_payload' ), (array) $items ),
			);
		}
		return rest_ensure_response( $result );
	}

	public function menu( $request ) {
		$this->load_menu_includes();
		$menu = wp_get_nav_menu_object( (int) $request['id'] );
		if ( ! $menu ) {
			return new WP_Error( 'not_found', '菜单不存在', array( 'status' => 404 ) );
		}
		$items = wp_get_nav_menu_items( $menu->term_id );
		return rest_ensure_response( array(
			'id'    => (int) $menu->term_id,
			'name'  => $menu->name,
			'slug'  => $menu->slug,
			'items' => array_map( array( $this, 'menu_item_payload' ), (array) $items ),
		) );
	}

	public function create_menu( $request ) {
		$this->load_menu_includes();
		$name = sanitize_text_field( $request['name'] );
		$id = wp_create_nav_menu( $name );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( array( 'ok' => true, 'id' => (int) $id ), 201 );
	}

	public function update_menu( $request ) {
		$this->load_menu_includes();
		$id = (int) $request['id'];
		$args = array();
		if ( isset( $request['name'] ) ) {
			$args['menu-name'] = sanitize_text_field( $request['name'] );
		}
		if ( isset( $request['slug'] ) ) {
			$args['slug'] = sanitize_title( $request['slug'] );
		}
		$result = wp_update_nav_menu_object( $id, $args );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( array( 'ok' => true, 'id' => $id ) );
	}

	public function delete_menu( $request ) {
		$this->load_menu_includes();
		$result = wp_delete_nav_menu( (int) $request['id'] );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}

	public function add_item( $request ) {
		$this->load_menu_includes();
		$menu_id = (int) $request['id'];
		$type = isset( $request['type'] ) ? sanitize_key( $request['type'] ) : 'custom';
		$item = array(
			'menu-item-type'      => 'custom' === $type ? 'custom' : 'post_type',
			'menu-item-status'    => 'publish',
			'menu-item-title'     => isset( $request['title'] ) ? sanitize_text_field( $request['title'] ) : '',
			'menu-item-url'       => isset( $request['url'] ) ? esc_url_raw( $request['url'] ) : '',
			'menu-item-parent-id' => isset( $request['parent'] ) ? (int) $request['parent'] : 0,
		);
		if ( 'post_type' === $type ) {
			$item['menu-item-object']    = isset( $request['object'] ) ? sanitize_key( $request['object'] ) : 'page';
			$item['menu-item-object-id'] = isset( $request['object_id'] ) ? (int) $request['object_id'] : 0;
		}
		$id = wp_update_nav_menu_item( $menu_id, 0, $item );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return rest_ensure_response( array( 'ok' => true, 'id' => (int) $id ) );
	}

	public function delete_item( $request ) {
		$this->load_menu_includes();
		$result = wp_delete_nav_menu_item( (int) $request['item'] );
		return rest_ensure_response( array( 'ok' => (bool) $result ) );
	}

	public function locations() {
		$menus = wp_get_nav_menus();
		$assigned = get_theme_mod( 'nav_menu_locations', array() );
		$items = array();
		foreach ( get_registered_nav_menus() as $slug => $name ) {
			$items[] = array(
				'slug' => $slug,
				'name' => $name,
				'menu' => isset( $assigned[ $slug ] ) ? (int) $assigned[ $slug ] : 0,
			);
		}
		return rest_ensure_response( array( 'locations' => $items, 'menus' => array_map( function ( $m ) {
			return array( 'id' => (int) $m->term_id, 'name' => $m->name );
		}, $menus ) ) );
	}

	public function assign_location( $request ) {
		$location = sanitize_key( $request['location'] );
		$menu_id = (int) $request['menu'];
		$assigned = (array) get_theme_mod( 'nav_menu_locations', array() );
		$assigned[ $location ] = $menu_id;
		set_theme_mod( 'nav_menu_locations', $assigned );
		return rest_ensure_response( array( 'ok' => true ) );
	}

	/* ----------------------------- 小工具 ----------------------------- */

	private function assignments() {
		return (array) get_option( 'sidebars_widgets', array() );
	}

	public function sidebars() {
		$items = array();
		foreach ( (array) $GLOBALS['wp_registered_sidebars'] as $id => $sidebar ) {
			$items[] = array(
				'id'          => $id,
				'name'        => $sidebar['name'],
				'description' => isset( $sidebar['description'] ) ? $sidebar['description'] : '',
			);
		}
		return rest_ensure_response( $items );
	}

	public function widgets() {
		$registered = array();
		foreach ( (array) $GLOBALS['wp_registered_widgets'] as $id => $widget ) {
			$registered[] = array(
				'id'   => $id,
				'name' => isset( $widget['name'] ) ? $widget['name'] : $id,
			);
		}
		return rest_ensure_response( array(
			'widgets'     => $registered,
			'sidebars'    => $this->sidebars()->get_data(),
			'assignments' => $this->assignments(),
		) );
	}

	public function save_sidebar( $request ) {
		$id = (string) $request['id'];
		$widgets = (array) $request['widgets'];
		$valid = array();
		foreach ( $widgets as $widget_id ) {
			$widget_id = sanitize_text_field( $widget_id );
			if ( isset( $GLOBALS['wp_registered_widgets'][ $widget_id ] ) ) {
				$valid[] = $widget_id;
			}
		}
		$assigned = $this->assignments();
		$assigned[ $id ] = $valid;
		update_option( 'sidebars_widgets', $assigned );
		return rest_ensure_response( array( 'ok' => true, 'widgets' => $valid ) );
	}

	public function remove_from_sidebar( $request ) {
		$id = (string) $request['id'];
		$widget_id = (string) $request['widget'];
		$assigned = $this->assignments();
		if ( isset( $assigned[ $id ] ) ) {
			$assigned[ $id ] = array_values( array_filter( $assigned[ $id ], function ( $item ) use ( $widget_id ) {
				return $item !== $widget_id;
			} ) );
			update_option( 'sidebars_widgets', $assigned );
		}
		return rest_ensure_response( array( 'ok' => true ) );
	}
}

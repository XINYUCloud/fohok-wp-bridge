<?php
/**
 * Plugin Name: FOHOK Bridge
 * Plugin URI:  https://github.com/XINYUCloud/fohok-wp-bridge
 * Description: 为 FOHOK WP Bridge 移动客户端提供 WordPress 站点全管理 REST 接口。
 * Version:     1.0.0
 * Requires at least: 5.9
 * Requires PHP: 7.4
 * Author:      FOHOK
 * Author URI:  https://www.fohok.xin
 * License:     GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: fohok-bridge
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'FOHOK_BRIDGE_VERSION', '1.0.0' );
define( 'FOHOK_BRIDGE_FILE', __FILE__ );
define( 'FOHOK_BRIDGE_DIR', plugin_dir_path( __FILE__ ) );
define( 'FOHOK_BRIDGE_URL', plugin_dir_url( __FILE__ ) );
define( 'FOHOK_BRIDGE_BASENAME', plugin_basename( __FILE__ ) );
define( 'FOHOK_BRIDGE_REPO', 'XINYUCloud/fohok-wp-bridge' );

require_once FOHOK_BRIDGE_DIR . 'includes/class-fohok-bridge.php';

register_activation_hook( __FILE__, array( 'FOHOK_Bridge', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'FOHOK_Bridge', 'deactivate' ) );

add_action( 'plugins_loaded', array( 'FOHOK_Bridge', 'instance' ) );

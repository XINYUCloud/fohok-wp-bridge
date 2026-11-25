<?php
/**
 * 插件主类：鉴权、路由、设置页、更新检查。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FOHOK_Bridge {

	/** @var FOHOK_Bridge|null */
	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'determine_current_user', array( $this, 'authenticate_token' ), 20 );
		add_filter( 'rest_pre_serve_request', array( $this, 'cors_headers' ), 10, 4 );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_action( 'admin_post_fohok_bridge_regenerate', array( $this, 'regenerate_token' ) );
		add_action( 'admin_post_fohok_bridge_save', array( $this, 'save_settings' ) );
		add_filter( 'plugin_action_links_' . FOHOK_BRIDGE_BASENAME, array( $this, 'action_links' ) );

		require_once FOHOK_BRIDGE_DIR . 'includes/class-updater.php';
		new FOHOK_Bridge_Updater();
	}

	public static function activate() {
		add_option( 'fohok_bridge_allowed_origins', '*' );
		add_option( 'fohok_bridge_enabled_features', array( 'plugins', 'themes', 'menus', 'widgets', 'settings', 'updates', 'health' ) );
	}

	public static function deactivate() {
		delete_transient( 'fohok_bridge_new_token' );
		delete_transient( 'fohok_bridge_release' );
	}

	/* ------------------------------------------------------------------ */
	/* 鉴权                                                                 */
	/* ------------------------------------------------------------------ */

	private function request_header( $name ) {
		$key = 'HTTP_' . strtoupper( str_replace( '-', '_', $name ) );
		if ( ! empty( $_SERVER[ $key ] ) ) {
			return trim( (string) wp_unslash( $_SERVER[ $key ] ) );
		}
		if ( function_exists( 'getallheaders' ) ) {
			foreach ( getallheaders() as $k => $v ) {
				if ( strcasecmp( $k, $name ) === 0 ) {
					return trim( (string) $v );
				}
			}
		}
		return '';
	}

	private function hash_token( $token ) {
		return hash( 'sha256', $token . wp_salt( 'auth' ) );
	}

	/** 由插件生成的连接密钥登录（应用密码之外的第二种方式）。 */
	public function authenticate_token( $user_id ) {
		$token = $this->request_header( 'X-FOHOK-Token' );
		if ( '' === $token ) {
			return $user_id;
		}
		$hash = get_option( 'fohok_bridge_token_hash' );
		if ( ! $hash || ! hash_equals( $hash, $this->hash_token( $token ) ) ) {
			return $user_id;
		}
		$owner = (int) get_option( 'fohok_bridge_token_user' );
		if ( $owner && get_userdata( $owner ) ) {
			return $owner;
		}
		return $user_id;
	}

	public function generate_token() {
		$token = wp_generate_password( 48, false, false );
		update_option( 'fohok_bridge_token_hash', $this->hash_token( $token ) );
		update_option( 'fohok_bridge_token_user', get_current_user_id() );
		set_transient( 'fohok_bridge_new_token', $token, 15 * MINUTE_IN_SECONDS );
		return $token;
	}

	/** APP 请求放行 CORS；仅当带有 X-FOHOK-App 头时生效。 */
	public function cors_headers( $served, $result = null, $request = null, $server = null ) {
		if ( headers_sent() || '' === $this->request_header( 'X-FOHOK-App' ) ) {
			return $served;
		}
		$origin = get_http_origin();
		$allowed = get_option( 'fohok_bridge_allowed_origins', '*' );
		if ( '*' === $allowed ) {
			$send = $origin ? $origin : '*';
		} elseif ( $origin && in_array( $origin, (array) $allowed, true ) ) {
			$send = $origin;
		} else {
			$send = '';
		}
		if ( $send ) {
			header( 'Access-Control-Allow-Origin: ' . $send );
			header( 'Access-Control-Allow-Credentials: true' );
			header( 'Vary: Origin' );
		}
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, X-FOHOK-Token, X-FOHOK-App' );
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
		return $served;
	}

	/* ------------------------------------------------------------------ */
	/* 路由                                                                 */
	/* ------------------------------------------------------------------ */

	public function register_routes() {
		$files = array(
			'class-endpoint-system.php',
			'class-endpoint-extensions.php',
			'class-endpoint-appearance.php',
			'class-endpoint-settings.php',
		);
		foreach ( $files as $file ) {
			require_once FOHOK_BRIDGE_DIR . 'includes/endpoints/' . $file;
		}
		$classes = array(
			'FOHOK_Endpoint_System',
			'FOHOK_Endpoint_Extensions',
			'FOHOK_Endpoint_Appearance',
			'FOHOK_Endpoint_Settings',
		);
		foreach ( $classes as $class ) {
			$controller = new $class();
			$controller->register_routes();
		}
	}

	/* ------------------------------------------------------------------ */
	/* 设置页                                                               */
	/* ------------------------------------------------------------------ */

	public function action_links( $links ) {
		$links[] = '<a href="' . esc_url( admin_url( 'options-general.php?page=fohok-bridge' ) ) . '">设置</a>';
		return $links;
	}

	public function admin_menu() {
		add_options_page( 'FOHOK Bridge', 'FOHOK Bridge', 'manage_options', 'fohok-bridge', array( $this, 'settings_page' ) );
	}

	private function token_hint() {
		$hash = get_option( 'fohok_bridge_token_hash' );
		return $hash ? substr( $hash, 0, 8 ) . '…' : '未生成';
	}

	public function settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '无权限' );
		}
		$new_token = get_transient( 'fohok_bridge_new_token' );
		if ( $new_token ) {
			delete_transient( 'fohok_bridge_new_token' );
		}
		$origins = get_option( 'fohok_bridge_allowed_origins', '*' );
		$origins_text = is_array( $origins ) ? implode( "\n", $origins ) : (string) $origins;
		?>
		<div class="wrap">
			<h1>FOHOK Bridge 设置</h1>
			<p>用于连接 FOHOK WP Bridge APP。APP 与插件独立发行：插件版本 <?php echo esc_html( FOHOK_BRIDGE_VERSION ); ?>.</p>

			<h2>连接密钥</h2>
			<?php if ( $new_token ) : ?>
				<div class="notice notice-success"><p><strong>请立即复制并保存，关闭页面后不再显示：</strong></p>
					<code id="fohok-token" style="display:block;padding:10px;word-break:break-all"><?php echo esc_html( $new_token ); ?></code>
					<p><button class="button" onclick="navigator.clipboard.writeText(document.getElementById('fohok-token').textContent);this.textContent='已复制'">复制密钥</button></p>
				</div>
			<?php else : ?>
				<p>当前密钥指纹：<code><?php echo esc_html( $this->token_hint() ); ?></code>。若密钥丢失，请重新生成（旧密钥立即失效）。</p>
			<?php endif; ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="fohok_bridge_regenerate">
				<?php wp_nonce_field( 'fohok_bridge_regenerate' ); ?>
				<?php submit_button( '重新生成连接密钥', 'secondary' ); ?>
			</form>

			<h2>允许的跨域来源</h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="fohok_bridge_save">
				<?php wp_nonce_field( 'fohok_bridge_save' ); ?>
				<p>每行一个来源；填写 <code>*</code> 表示允许任意来源（APP 请求必须携带 X-FOHOK-App 头）。</p>
				<textarea name="allowed_origins" rows="4" cols="60"><?php echo esc_textarea( $origins_text ); ?></textarea>
				<?php submit_button( '保存' ); ?>
			</form>

			<h2>连接说明</h2>
			<ol>
				<li>APP 中填写站点地址，并使用「连接密钥」或 WordPress 应用密码登录。</li>
				<li>文章、页面、媒体、评论、用户、分类标签等使用 WordPress 核心 REST API。</li>
				<li>插件、主题、菜单、小工具、设置、更新、站点健康使用本插件的 <code>/wp-json/fohok/v1</code> 接口。</li>
			</ol>
			<p>开发者：<a href="https://www.fohok.xin" target="_blank" rel="noopener">FOHOK</a> ·
				<a href="https://github.com/XINYUCloud/fohok-wp-bridge" target="_blank" rel="noopener">源码仓库</a> ·
				<a href="mailto:open@fohok.xin">open@fohok.xin</a></p>
		</div>
		<?php
	}

	public function regenerate_token() {
		check_admin_referer( 'fohok_bridge_regenerate' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '无权限' );
		}
		$this->generate_token();
		wp_safe_redirect( admin_url( 'options-general.php?page=fohok-bridge' ) );
		exit;
	}

	public function save_settings() {
		check_admin_referer( 'fohok_bridge_save' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( '无权限' );
		}
		$raw = isset( $_POST['allowed_origins'] ) ? wp_unslash( $_POST['allowed_origins'] ) : '*';
		$lines = array_filter( array_map( 'trim', explode( "\n", str_replace( "\r", '', $raw ) ) ) );
		update_option( 'fohok_bridge_allowed_origins', empty( $lines ) ? '*' : array_values( $lines ) );
		wp_safe_redirect( add_query_arg( 'saved', '1', admin_url( 'options-general.php?page=fohok-bridge' ) ) );
		exit;
	}
}

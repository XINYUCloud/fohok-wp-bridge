<?php
/**
 * 通过比对 GitHub 发行版实现插件自更新。
 * 发行标签：plugin-v1.0.0（APP 使用 app-v1.0.0，互不干扰）。
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class FOHOK_Bridge_Updater {

	const API = 'https://api.github.com/repos/' . FOHOK_BRIDGE_REPO . '/releases?per_page=30';

	public function __construct() {
		add_filter( 'site_transient_update_plugins', array( $this, 'inject_update' ) );
		add_filter( 'plugins_api', array( $this, 'plugin_info' ), 20, 3 );
	}

	private function releases() {
		$cached = get_site_transient( 'fohok_bridge_releases' );
		if ( is_array( $cached ) ) {
			return $cached;
		}
		$response = wp_remote_get( self::API, array(
			'timeout' => 12,
			'headers' => array( 'Accept' => 'application/vnd.github+json', 'User-Agent' => 'FOHOK-Bridge/' . FOHOK_BRIDGE_VERSION ),
		) );
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return array();
		}
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $data ) ) {
			return array();
		}
		set_site_transient( 'fohok_bridge_releases', $data, 6 * HOUR_IN_SECONDS );
		return $data;
	}

	private function latest_plugin_release() {
		foreach ( $this->releases() as $release ) {
			$tag = isset( $release['tag_name'] ) ? $release['tag_name'] : '';
			if ( 0 === strpos( $tag, 'plugin-v' ) ) {
				return $release;
			}
		}
		return null;
	}

	private function version_from_tag( $tag ) {
		return ltrim( substr( $tag, strlen( 'plugin-v' ) ), 'v' );
	}

	public function inject_update( $transient ) {
		if ( ! is_object( $transient ) || empty( $transient->checked ) ) {
			return $transient;
		}
		$release = $this->latest_plugin_release();
		if ( ! $release ) {
			return $transient;
		}
		$version = $this->version_from_tag( $release['tag_name'] );
		if ( ! version_compare( FOHOK_BRIDGE_VERSION, $version, '<' ) ) {
			return $transient;
		}
		$package = '';
		if ( ! empty( $release['assets'] ) ) {
			foreach ( $release['assets'] as $asset ) {
				if ( ! empty( $asset['browser_download_url'] ) && preg_match( '/\.zip$/i', $asset['browser_download_url'] ) ) {
					$package = $asset['browser_download_url'];
					break;
				}
			}
		}
		if ( ! $package ) {
			$package = isset( $release['zipball_url'] ) ? $release['zipball_url'] : '';
		}

		$transient->response[ FOHOK_BRIDGE_BASENAME ] = (object) array(
			'id'          => FOHOK_BRIDGE_BASENAME,
			'slug'        => 'fohok-bridge',
			'plugin'      => FOHOK_BRIDGE_BASENAME,
			'new_version' => $version,
			'url'         => 'https://github.com/' . FOHOK_BRIDGE_REPO,
			'package'     => $package,
			'icons'       => array(),
			'banners'     => array(),
		);
		return $transient;
	}

	public function plugin_info( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || 'fohok-bridge' !== $args->slug ) {
			return $result;
		}
		$release = $this->latest_plugin_release();
		$result = (object) array(
			'name'           => 'FOHOK Bridge',
			'slug'           => 'fohok-bridge',
			'version'        => $release ? $this->version_from_tag( $release['tag_name'] ) : FOHOK_BRIDGE_VERSION,
			'author'         => '<a href="https://www.fohok.xin">FOHOK</a>',
			'homepage'       => 'https://www.fohok.xin',
			'short_description' => 'FOHOK WP Bridge APP 的 WordPress 管理接口插件。',
			'sections'       => array( 'description' => '为移动客户端提供完整站点管理 REST 接口，支持插件、主题、菜单、小工具、设置、更新与站点健康。' ),
			'download_link'  => 'https://github.com/' . FOHOK_BRIDGE_REPO,
		);
		return $result;
	}
}

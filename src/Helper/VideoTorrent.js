/**
 * ZLX WebTorrent Player
 *
 * A player based on VideoJS with support to quality switching using WebTorrents to take advantage of P2P in the web, and Video Ads with Google IMA
 *
 * @author      Alexandre de Freitas Caetano <https://github.com/aledefreitas>
 * @copyright   Alexandre de Freitas Caetano
 * @since       0.0.1
 */

// Load dependencies
var WebTorrent = require("webtorrent");

/**
 * VideoTorrent constructor
 *
 * @return void
 */
var VideoTorrent = function VideoTorrent() {
    this.torrent = null;
    this.destroy = function() {
        return Promise.resolve(true);
    }
};

/**
 * Changes the active torrent to another magnet url
 *
 * @param   string      magnet_url      Magnet URL
 *
 * @return Promise
 */
VideoTorrent.prototype.change = function change(magnet_url) {
    var self = this;

    if(this.torrent !== null) {
        this.destroy = function() {
            return new Promise(function(resolve, reject) {
                try {
                    self.torrent.destroy(function() {
                        self.torrent = null;
                        resolve(true)
                    });
                } catch(e) {
                    reject(e);
                }
            });
        };
    }

    return this.destroy().then(function() {
        self.torrent = new WebTorrent();

        return self.torrent.add(magnet_url, function(file) {
            return file;
        });
    });
};

/**
 * Returns a boolean that determines if webtorrent is supported or not
 *
 * @return boolean
 */
VideoTorrent.prototype.isSupported = function isSupported() {
    return WebTorrent.WEBRTC_SUPPORT;
}

module.exports = VideoTorrent;

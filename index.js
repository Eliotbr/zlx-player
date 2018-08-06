/**
 * ZLX WebTorrent Player
 *
 * A player based on VideoJS with support to quality switching using WebTorrents to take advantage of P2P in the web, and Video Ads with Google IMA
 *
 * @author      Alexandre de Freitas Caetano <https://github.com/aledefreitas>
 * @copyright   Alexandre de Freitas Caetano
 * @since       0.0.1
 */
(function() {
    'use strict';

    /**
     * Load dependencies
     */
    var videojs = require("video.js");
    var DependencyInjector = require("./src/Helper/DependencyInjector.js");
    var VideoTorrent = require("./src/Helper/VideoTorrent.js");
    var WebTorrent = require("webtorrent");

    /**
     * ZLX Player constructor
     *
     * @param   string                  player_element          The ID of the element on which the player will be started
     * @param   Object                  options                 Options to configure the player
     * @param   Function                callback                Callback to be called once the player is loaded
     *
     * @return  void
     */
    var ZLXPlayer = function ZLXPlayer(player_element, opts, callback) {
        var self = this;

        this._playerElement = player_element;
        this._playerElementDOM = document.getElementById(player_element);
        this.dependencyInjector = new DependencyInjector(videojs);
        this.VideoTorrent = new VideoTorrent();

        try {
            this.opts = {
                "autoplay": true,
                "controls": true,
                "sources": {},
                "prefer_quality": "high",
                // Advertising Tag used on IMA
                "adTagUrl": null,
                // adLabel used on IMA
                "adLabel": "Advertising",
                "use_torrent": true,
            };

            this._loadOptions(opts);

            this._config = {
                "autoplay": this.opts.autoplay,
                "controls": this.opts.controls,
                "plugins": {},
            };

            this.dependencyInjector.loadDependencies().then(function() {
                self._createPlayer().then(function(player) {
                    self.player = player;

                    self._loadAds();

                    return callback(self.player);
                });
            }).catch(function(e) {
                console.log("[ZLX PLAYER] >> ERROR << " + e);
            });
        } catch(e) {
            console.log("[ZLX PLAYER] >> ERROR << " + e);
        }
    };

    /**
     * Loads the custom options
     *
     * @param   Object      opts            Custom options
     *
     * @return  void
     */
    ZLXPlayer.prototype._loadOptions = function _loadOptions(opts) {
        opts = opts || {};

        for(var key in opts) {
            this.opts[key] = opts[key];
        }
    };

    /**
     * Creates the player using VideoJS
     *
     * @return Promise
     */
    ZLXPlayer.prototype._createPlayer = function _createPlayer() {
        var self = this;

        return new Promise(function(resolve, reject) {
            var _configs = self._configPlayer();
            var client = new WebTorrent();

            var _player = videojs(self._playerElement, _configs, function() {
                var _sources = self.opts.sources || {};
                var player_srcs = [];

                for(var quality in _sources) {
                    if(Array.isArray(_sources[quality])) {
                        for(var src in _sources[quality]) {
                            player_srcs.push({
                                'label': quality.toUpperCase(),
                                'src': _sources[quality][src].src,
                                'type': _sources[quality][src].type,
                                'magnet': _sources[quality][src].magnet
                            });
                        }
                    } else {
                        player_srcs.push({
                            "label": quality.toUpperCase(),
                            "src": _sources[quality].src,
                            "type": _sources[quality].type,
                            'magnet': _sources[quality].magnet
                        });
                    }
                }

                _player.updateSrc(player_srcs);

                resolve(_player);
            });
        });
    };

    /**
     * Loads the ads onto the player
     *
     * @return void
     */
    ZLXPlayer.prototype._loadAds = function _loadAds() {
        var self = this;

        var options = {
            'id': this._playerElement,
            'adTagUrl': this.opts.adTagUrl,
            'adLabel': this.opts.adLabel
        };

        var supportsES6 = function() {
          try {
            new Function("(a = 0) => a");
            return true;
          }
          catch (err) {
            return false;
          }
        }();

        if(options.adTagUrl && supportsES6 === true) {
            videojs.Html5 = videojs.getComponent('Html5');
            this.player.ima(options);

            var startEvent = 'click';
            if(navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/Android/i)) {
                startEvent = 'touchend';
            }

            var contentPlayer =  document.getElementById(this._playerElement + '_html5_api');

            if(contentPlayer) {
                if((navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/Android/i)) && contentPlayer.hasAttribute('controls')) {
                    contentPlayer.removeAttribute('controls');
                }

                if(this.player.autoplay() !== true) {
                    this.player.one(startEvent, function() {
                        self.player.ima.initializeAdDisplayContainer();
                        self.player.ima.requestAds();
                        self.player.play();
                    });
                } else {
                    this.player.ima.initializeAdDisplayContainer();
                    this.player.ima.requestAds();
                }
            } else {
                this.player.one(startEvent, function() {
                    self.player.play();
                });
            }
        }
    };

    /**
     * Configs the player and returns the config object
     *
     * @return Object
     */
    ZLXPlayer.prototype._configPlayer = function _configPlayer() {
        var self = this;

        this._config.plugins['videoJsResolutionSwitcher'] = null;

        var qualitySwitcherConfig = {
            "default": this.opts.prefer_quality
        };

        qualitySwitcherConfig['customSourcePicker'] = this._customSourcePicker.bind(this);

        this._config.plugins['videoJsResolutionSwitcher'] = qualitySwitcherConfig;

        return this._config;
    };

    /**
     * Sets the source to the player to a server source
     *
     * @param   VideoJS.Player      player          VideoJS Player object
     * @param   string              source          Source URL
     * @param   type                type            Type of source
     *
     * @return  void
     */
    ZLXPlayer.prototype._fallbackToServer = function _fallbackToServer(player, source, type) {
        player.src({
            'src': source,
            'type': type
        });

        player.one('error', function() {
            var error = player.error();
            switch(error.code) {
                case 2:
                case 4:
                    var currentResolution = player.currentResolution();
                    var sources = currentResolution.sources;

                    for(var i = 0; i < sources.length - 1; i++) {
                        if(sources[i].src === source && sources[i+1]) {
                            var nextSource = sources[i+1];
                            return this._customSourcePicker(player, nextSource, currentResolution.label, false);
                        }
                    }
                break;

                default:
                    return;
                break;
            }
        }.bind(this));
    };

    /**
     * Custom source picker for VideoJS Quality Switcher Plugin
     *
     * @param   VideoJS.Player      player          VideoJS Player object
     * @param   Object              sources         Sources Object
     * @param   string              label           Quality label
     * @param   boolean             is_starting     Boolean that determines if the video is playing for the first time
     *
     * @return  VideoJS.Player
     */
    ZLXPlayer.prototype._customSourcePicker = function _customSourcePicker(player, sources, label, is_starting) {
        var self = this;

        try {
            var _source = {};

            if(Array.isArray(sources)) {
                _source = sources[0];
            } else {
                _source = sources;
            }

            if(this.opts.use_torrent === false) {
                throw("WebTorrent usage is disabled. Falling back to server.");
            }

            if(!this.VideoTorrent.isSupported()) {
                throw("WebTorrent is not supported. Falling back to server only.")
            }

            if(!_source.magnet) {
                throw("No magnet link to Quality " + label + " and Source "+_source.src+". Falling back to Server only.");
            }

            this.VideoTorrent.change(_source.magnet).then(function(torrent) {
                var file = torrent.files.find(function(file) {
                    return file.name.endsWith('.mp4')
                });

                file.renderTo(self._playerElementDOM, {
                    "autoplay": self.opts.autoplay
                });
            }).catch(function(e) {
                console.log(e);
                console.log('Falling back to server');

                self._fallbackToServer(player, _source.src, _source.type);
            });
        } catch(e) {
            console.log(e);
            console.log('Falling back to server');

            this._fallbackToServer(player, _source.src, _source.type);
        }

        return player;
    };

    window.ZLXPlayer = ZLXPlayer;
})();

/**
 * ZLX WebTorrent Player
 *
 * A player based on VideoJS with support to quality switching using WebTorrents to take advantage of P2P in the web, and Video Ads with Google IMA
 *
 * @author      Alexandre de Freitas Caetano <https://github.com/aledefreitas>
 * @copyright   Alexandre de Freitas Caetano
 * @since       0.0.1
 */

/**
 * DependencyInjector constructor
 *
 * @param   VideoJS     videojs         VideoJS Instance
 *
 * @return void
 */
var DependencyInjector = function DependencyInjector(videojs) {
    this._videojs = videojs;
    this._scripts = [
        { url: "//imasdk.googleapis.com/js/sdkloader/ima3.js", required: false }
    ];
};

/**
 * Loads all dependencies for the player
 *
 * @return Promise
 */
DependencyInjector.prototype.loadDependencies = function loadDependencies() {
    var self = this;
    window.videojs = this._videojs;
    var _promises = [];

    for(var i = 0; i < this._scripts.length; i++) {
        _promises.push(this._loadScript(this._scripts[i]));
    }

    return Promise.all(_promises).then(function(result) {
        var vjsQualitySwitcher = require("videojs-resolution-switcher");
        var videojs_ima = require("videojs-ima");

        self._videojs.plugin('ima', function(options, readyCallback) {
            this.ima = new videojs_ima(this, options, readyCallback);
        });

    }).catch(function(e) {
        console.log(e.stack);
        throw new Error("Could not load dependency: " + e);
    });
};

/**
 * Loads a Script to the DOM Head
 *
 * @param   Object      scriptObj          Script Object
 *
 * @return Promise
 */
DependencyInjector.prototype._loadScript = function _loadScript(scriptObj) {
    return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = scriptObj.url;

        script.onload = function() {
            resolve(true);
        }

        script.onerror = function() {
            if(scriptObj.required===true) {
                reject(script);
            } else {
                resolve(false);
            }
        }

        document.head.appendChild(script);
    });
};

module.exports = DependencyInjector;

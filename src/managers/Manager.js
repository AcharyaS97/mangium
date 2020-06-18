/*
 *     Copyright (C) 2020   Floffah
 *
 *     @author Floffah & Mangium Contributors
 *     @link https://github.com/floffah/
 */

const Logger = require('../log/Log'),
    Path = require('path'),
    fs = require('fs'),
    chalk = require('chalk'),
    WebManager = require('./WebManager'),
    low = require('lowdb'),
    fisy = require('lowdb/adapters/FileSync'),
    DatabaseManager = require('./DatabaseManager');

class Manager {
    /**
     * Mangium manager.
     * @param {object} opts
     * @param {boolean} opts.cib
     * @param {cibdone} opts.cibdone
     */
    constructor(opts) {
        this._options = opts;
        this._errors = [];
        this._paths = new Map([
            ["data", Path.join(__dirname, '../../data')],
            ["config", Path.join(__dirname, '../../data/config')],
            ["cache", Path.join(__dirname, '../../data/cache')],
            ["web", Path.join(__dirname, '../../media/dist')],
            ["db", Path.join(__dirname, '../../data/db')],
            ["logs", Path.join(__dirname, '../../data/logs')],
            ["err", Path.join(__dirname, '../../data/logs/errors')]
        ]);
        this._paths.forEach((v) => {
            if (!fs.existsSync(v)) {
                fs.mkdirSync(v);
            }
        });
        this._logger = new Logger(this, false);
        this._initialized = false;
        this.dodb = false;
    }

    initialize() {
        this.getLogger().info("Initialising mangium...");

        // config
        if (!fs.existsSync(Path.join(this.getPath("config"), "config.json"))) {
            this._config = low(new fisy(Path.join(this.getPath("config"), 'config.json')));
            this._config.defaults({
                web: {
                    hostname: "127.0.0.1",
                    port: 3000
                },
                database: {
                    type: "sqlite"
                },
                settings: {
                    setup: false
                }
            }).write()
        } else {
            this._config = low(new fisy(Path.join(this.getPath("config"), 'config.json')));
        }

        // db load
        this._dbManager = new DatabaseManager(this);
        this._dbManager.init();

        // db web create
        this._webManager = new WebManager(this);
        this._webManager.create();

        // finish initialize
        this._initialized = true;
    }

    load() {
        // web start
        this._webManager.listen();
        if (this._config.get("settings.setup").value() !== true) {
            this._webManager.needSetup();
        }

        // end if in build mode
        if (this._options.cibdone !== undefined) {
            this._options.cibdone(this._errors.length >= 1, this._errors);
        }

        this._webManager.started();
    }

    end() {
        this._webManager.stop();
        this.getLogger().info("Mangium stopped.");
    }

    /**
     * Pass an error to mangium if there was an error along the way. The error is sent to the cibuild area when it runs
     * cibdone.
     * @param err
     */
    passError(err) {
        this._errors.push(err);
    }

    /**
     * Get a path
     * @param {String} name
     * @returns {String}
     */
    getPath(name) {
        return this._paths.get(name);
    }

    /**
     * Set a path
     * @param {String} name
     * @param {String} path
     */
    setPath(name, path) {
        this._paths.set(name, path);
    }

    /**
     *
     * @returns {If<*[AsyncProperty], Promise<Lowdb.Lowdb<RecursivelyExtend<*[ReferenceProperty], AsyncTag>, *>>, Lowdb.Lowdb<RecursivelyExtend<*[ReferenceProperty], SyncTag>, *>> | If<*[AsyncProperty], Promise<Lowdb.Lowdb<RecursivelyExtend<*[ReferenceProperty], AsyncTag>, *>>, Lowdb.Lowdb<RecursivelyExtend<*[ReferenceProperty], SyncTag>, *>>}
     */
    getConfig() {
        return this._config;
    }

    /**
     *
     * @returns {DatabaseManager}
     */
    getDbManager() {
        return this._dbManager;
    }

    /**
     *
     * @returns {Logger}
     */
    getLogger() {
        return this._logger;
    }

    /**
     * Get the api manager.
     * @returns {WebManager}
     */
    getWebManager() {
        return this._webManager;
    }
}

module.exports = Manager;

/**
 * @callback cibdone
 * @param {boolean} diderr
 * @param {Error[]} [err]
 */

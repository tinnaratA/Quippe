var express = require('express');
var http = require('http');
var quippe = require('@medicomp/quippe');
var app = express();
var path = require('path');
var cluster = require('cluster');
var cpuCount = require('os').cpus().length;
var nconf = require('nconf');
var winston = require('winston');

nconf.argv({
    'QUIPPE_USE_CLUSTERING': {
        alias: 'use-clustering'
    },
    'PORT': {
        alias: 'port'
    },
    'QUIPPE_WORKERS': {
        alias: 'worker-count'
    },
    'LOG_FILE': {
        alias: 'log-file'
    },
    'LOG_LEVEL': {
        alias: 'log-level'
    },
    'SERVE_STATIC_FILES': {
        alias: 'serve-static-files'
    }
}).env().defaults({
    QUIPPE_USE_CLUSTERING: "true",
    PORT: 9100,
    QUIPPE_WORKERS: cpuCount,
    LOG_LEVEL: 'info',
    SERVE_STATIC_FILES: "true"
});

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    level: nconf.get('LOG_LEVEL'),
    colorize: true,
    timestamp: function() {
        return new Date().toISOString() + " (pid: " + process.pid + ")";
    }
});

if (nconf.get('LOG_FILE')) {
    winston.add(winston.transports.DailyRotateFile, {
        level: nconf.get('LOG_LEVEL'),
        filename: nconf.get('LOG_FILE'),
        timestamp: function() {
            return new Date().toISOString() + " (pid: " + process.pid + ")";
        },
        maxFiles: 30,
        json: false
    });
}

if (cluster.isMaster && nconf.get('QUIPPE_USE_CLUSTERING') != "false") {
    cluster.on('exit', function(worker, code, signal) {
        winston.warn('Worker %d died (%s), restarting.', worker.process.pid, signal || code);
        cluster.fork();
    });

    cluster.on('fork', function(worker) {
        winston.info('Worker %d started.', worker.process.pid);
    });

    winston.info('Forking %d worker processes', nconf.get('QUIPPE_WORKERS'));

    for (var i = 0; i < nconf.get('QUIPPE_WORKERS'); i++) {
        cluster.fork();
    }
}

else {
    quippe.setup({
        serveSdkSiteStaticFiles: nconf.get("SERVE_STATIC_FILES") == "true",
        sdkSiteDirectory: "/var/www/quippe/developer",
        webConfigPath: "/var/www/quippe/nodejs/web.config",
        dataDirectory: "/var/data/medicomp/quippe",
        servicesDirectory: path.join(__dirname, 'services'),
        routesDirectory: path.join(__dirname, 'routes'),
        fileUploadDirectory: "/tmp",
        logger: winston
    }).then(function () {
        if (quippe.config.serveSdkSiteStaticFiles) {
            winston.info('Serving static content from %s', quippe.config.sdkSiteDirectory);

            app.use(express.static(quippe.config.sdkSiteDirectory, {
                index: "Default.htm"
            }));
        }

        app.use(quippe.middleware);
        
        // If you want to use the /proxy route, uncomment the below two lines
        //winston.info('Listening for requests to /proxy');
        //app.use(quippe.proxyMiddleware);

        http.createServer(app).listen(nconf.get('PORT'), function() {
            winston.info('Quippe Node.js server listening on port %d', nconf.get('PORT'));
        });
    }, function(errors) {
        winston.error("Error calling quippe.setup(): %s", errors, {});
        process.exit();
    });
}
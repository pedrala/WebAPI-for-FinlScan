//
const { Sema } = require("async-sema");
const cluster = require("cluster");
const os = require("os");

const TxLock = new Sema(1, { capacity : 100} );

//
const define = require("./../config/define.js");
const config = require("./../config/config.js");

const chkNodeNft = require("./tx/chkNodeNft.js");;
// const redisUtil = require("./net/redisUtil.js");
// const cryptoUtil = require("./sec/cryptoUtil.js");
const cli = require("./cli/cli.js");
const util = require("./utils/commonUtil.js");
const timer = require("./utils/timer.js");
const logger = require("./utils/winlog.js");

//
module.exports.MAX_CLUSTER_WORKER_NUM = define.CLUSTER_DEFINE.DEF_CLUSTER_WORKER_NUM + define.CLUSTER_DEFINE.API_CLUSTER_WORKER_NUM;

//
module.exports.getTxLock = aysnc => {
    return TxLock;
}

//
module.exports.clusterInit = async () => { 
    if (cluster.isMaster)
    {
        console.log(define.START_MSG);

        logger.info("[M] Master start");
        
        for(var i = 0; i < this.MAX_CLUSTER_WORKER_NUM; i++)
        {
            cluster.fork();
        }

        cluster.on("online", (worker) => {
            // Each Worker Online then something TODO Here
            // console.log("[M] workerid : " + worker.id + " is online");
        });

        cluster.on("exit", (worker, code, signal) => {
            // When some worker eixt then code here
            logger.debug("[M] " + worker.id + "'s worker is exit"); 

            logger.error("[M] " + worker.id + "'s worker exit code : " + code.toString());
            logger.error("[M] " + worker.id + "'s worker exit signal : " + signal);

            var env = worker.process.env;
            var newWorker = cluster.fork(env);
            newWorker.process.env = env;
        });

        cluster.on("message", async (worker, msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.RCV_NODE_NFT_INFO_ARR_IND :
                // // logger.debug("received CMD " + msg.cmd + " from " + worker);
                // if(msg['data'].length && util.isArray(msg['data']))
                // {
                //     cluster.workers[define.CLUSTER_DEFINE.NODE_NFT_CLUSTER_WORKER_ID_STR].send(msg);
                // }
                break;
            case define.CMD_DEFINE.NULL_NFT_INFO_TXS_IND :
                // // logger.debug("[M] " + worker.id + " : " + "NULL_NFT_INFO_TXS_IND"); 
                // cluster.workers[define.CLUSTER_DEFINE.NODE_NFT_CLUSTER_WORKER_ID_STR].send(msg);
                break;
            default :
                // Error
                break;
            }
        });
    }
    else if (cluster.worker.id <= define.CLUSTER_DEFINE.API_CLUSTER_WORKER_NUM)
    {
        //
        var http = require('http');
        var debug = require('debug')('tn:server');

        //
        // var app = require('./../app');
        var app = require('./../app.js');
        
        //
        logger.info("[W] " + cluster.worker.id + "'s Worker start");

        /**
        * Get port from environment and store in Express.
        */
        var port = normalizePort(config.CFG_PATH.WEBAPI.ISAG_PORT.toString() || '3000'); // '3000'
        app.set('port', port);

        /**
        * Create HTTP server.
        */
        var server = http.createServer(app);

        /**
        * Listen on provided port, on all network interfaces.
        */
        server.listen(port);
        // server.on('error', nodeonError);
        // server.on('listening', onListening);

        /**
        * Normalize a port into a number, string, or false.
        */
        function normalizePort(val) {
            var port = parseInt(val, 10);

            if (isNaN(port))
            {
                // named pipe
                return val;
            }

            if (port >= 0)
            {
                // port number
                return port;
            }

            return false;
        }

        /**
        * Event listener for HTTP server "error" event.
        */
        function onError(error) {
            if (error.syscall !== 'listen')
            {
                throw error;
            }

            var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

            // handle specific listen errors with friendly messages
            switch (error.code)
            {
                case 'EACCES':
                    logger.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    logger.error(bind + ' is already in use');
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        }

        /**
        * Event listener for HTTP server "listening" event.
        */
        function onListening() {
            var addr = server.address();
            var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
            debug('Listening on ' + bind);
        }

        // timer.setIntervalApiToNodeNft();
    }
    else if ((define.CLUSTER_DEFINE.API_CLUSTER_WORKER_NUM < define.CLUSTER_DEFINE.CLI_CLUSTER_WORKER_ID) && 
            (define.CLUSTER_DEFINE.CLI_CLUSTER_WORKER_ID <= this.MAX_CLUSTER_WORKER_NUM) &&
            (cluster.worker.id === define.CLUSTER_DEFINE.CLI_CLUSTER_WORKER_ID))
    {
        //
        logger.info("[W] " + cluster.worker.id + "'s Worker start");

        cli.cliCallback();

        // timer.setIntervalApiToNodeNft();
    } 
    else if ((define.CLUSTER_DEFINE.API_CLUSTER_WORKER_NUM < define.CLUSTER_DEFINE.NODE_NFT_CLUSTER_WORKER_ID) && 
            (define.CLUSTER_DEFINE.NODE_NFT_CLUSTER_WORKER_ID <= this.MAX_CLUSTER_WORKER_NUM) &&
            (cluster.worker.id === define.CLUSTER_DEFINE.NODE_NFT_CLUSTER_WORKER_ID))
    {
        //
        logger.info("[W] " + cluster.worker.id + "'s Worker start");

        // timer.setIntervalChkNodeNft();

        //
        process.on('message', async (msg) => {
            switch (msg.cmd)
            {
            case define.CMD_DEFINE.RCV_NODE_NFT_INFO_ARR_IND :
                // if(msg['data'].length && util.isArray(msg['data']))
                // {
                //     await TxLock.acquire();
                //     await chkNodeNft.setNodeNftInfoArr(msg['data']);
                //     await chkNodeNft.nodeNftInfoArrSortedAsc();
                //     await TxLock.release();
                // }
                break;
            case define.CMD_DEFINE.NULL_NFT_INFO_TXS_IND :
                // // logger.debug("[K] " + worker.id + " : " + "NULL_NFT_INFO_TXS_IND"); 
                // await TxLock.acquire();
                // await chkNodeNft.sendFinlToSch();
                // await TxLock.release();
                break;
            default :
                // Error
                break;
            }
        });
    } 
}

//
module.exports.sendNodeNftInfoArrToMaster = async () => {
    await TxLock.acquire();
    let tempArray = [...chkNodeNft.getNodeNftInfoArr()];
    process.send({cmd : define.CMD_DEFINE.RCV_NODE_NFT_INFO_ARR_IND, data : tempArray});
    chkNodeNft.reinitNodeNftArray();
    await TxLock.release();
}

module.exports.sendNullNftInfoTxsToMaster = async () => {
    // logger.debug("sendNullNftInfoTxsToMaster");
    await process.send({cmd : define.CMD_DEFINE.NULL_NFT_INFO_TXS_IND, data : ""});
}
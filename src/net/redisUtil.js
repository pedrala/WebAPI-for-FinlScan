//
const redis = require('redis');

//
const config = require("./../../config/config.js");
const define = require("./../../config/define.js");
const util = require("./../utils/commonUtil.js");

const redisHandler = require("./../net/redisHandler.js");

const logger = require("./../utils/winlog.js");

//
let TxContractPublisher; // Local
let TxContractSubscriber; // Local

//
const retry_strategy_func = (options) => {
    if(options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        return new Error('Retry time exhausted');
    }
    if (options.attemp > 10) {
        // End reconnecting with built in error
        return undefined
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
}

const redisChannelCheckCallbackPromise = async (redisClient, channel) => {
    return new Promise((resolve, reject) => {
        redisClient.pubsub("CHANNELS", channel, (err, replies) => {
            if(err) {
                reject(err);
            } else {
                resolve(replies);
            }
        });
    });
}

const redisChannelCheck = async (redisClient, channel) => {
    let res = await redisChannelCheckCallbackPromise(redisClient, channel).then((resData) => {
        return resData;
    });

    if(!res.length) {
        process.send({cmd : 'redisChkCfm', data : define.CLUSTER_DEFINE.REDIS_CHANNEL_ERROR});
    }
}

// Local
module.exports.writeLocalTxContract = async (contract) => {
    logger.debug("writeLocalTxContract STT " + util.getDateMS());
    if(define.REDIS_DEFINE.REDIS_PUBSUB_CHECK)
    {
        redisChannelCheck(TxContractPublisher, define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT);
    }  
    logger.debug("[REDIS - PUB] [" + define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT + "]");// -> (" + contract.toString() + ")");
    TxContractPublisher.publish(define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT, contract);
}


module.exports.setNNALocalSubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;

    TxContractSubscriber = redis.createClient(redis_conf);

    // subscribe -> waitting TransactionAcks From NNA
    TxContractSubscriber.on("message", async (channel, message) => {
        await redisHandler.localTxContractCB(message);
    });
    TxContractSubscriber.subscribe(define.REDIS_DEFINE.LOCAL_CHANNEL.TX_CONTRACT);
}

module.exports.setLocalPubRedis = async () => {
    let redis_conf = config.REDIS_CONFIG;
    redis_conf.retry_strategy = retry_strategy_func;

    TxContractPublisher = redis.createClient(redis_conf);
}
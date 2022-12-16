//
const config = require('./../../config/config.js');
const define = require('./../../config/define.js');
const util = require('./../utils/commonUtil.js');
const base58 = require('./../utils/base58.js');
const cryptoUtil = require('./../sec/cryptoUtil.js');
const encrypto = require('./../sec/encrypto.js');

const webApi = require('./../net/webApi.js');
//
const cryptoApi = require('./../sec/cryptoApi.js');

const logger = require('./../utils/applog.js');

//
module.exports.schSecretKey = "38df3a8e044d47e891a51f539633a391"
module.exports.schApiKey = "a2320fb0bb92478a93d0608e2507952a";
module.exports.schVer = "V1.0.0";
module.exports.schSymbol = "user";

//
module.exports.schLastDay = "20310331";

module.exports.genSig = async (apiKey,ts, secretKey) => {
    //
    let sigData = "apiKey=" + apiKey + "&timestamp=" + ts + "&version=" + this.schVer;
    logger.debug("sigData : " + sigData);

    let sig = cryptoApi.generateSignature(secretKey, sigData);
    logger.debug('sig : ' + sig);

    return (sig);
}

module.exports.ts2Day = (ts) => {
    let myDate = util.timestamp2Date(ts);
    logger.debug("myDate : " + myDate);

    //
    let myDateYear = myDate.getFullYear();
    let myDateMonth = ('0' + (myDate.getMonth()+1)).slice(-2);
    let myDateDay = ('0' + myDate.getDate()).slice(-2);
    // let myDateHour = ('0' + myDate.getHours()).slice(-2);
    // let myDateMin = ('0' + myDate.getMinutes()).slice(-2);
    // let myDateSec = ('0' + myDate.getSeconds()).slice(-2);
    // let myDateMs = myDate.getMilliseconds();

    //
    let schDay = myDateYear + myDateMonth + myDateDay;
    logger.debug("schDay: "+ schDay);

    return (schDay);
}

module.exports.ts2Date = (ts) => {
    let myDate = util.timestamp2Date(ts);
    logger.debug("myDate : " + myDate);

    //
    let myDateYear = myDate.getFullYear();
    let myDateMonth = ('0' + (myDate.getMonth()+1)).slice(-2);
    let myDateDay = ('0' + myDate.getDate()).slice(-2);
    let myDateHour = ('0' + myDate.getHours()).slice(-2);
    let myDateMin = ('0' + myDate.getMinutes()).slice(-2);
    let myDateSec = ('0' + myDate.getSeconds()).slice(-2);
    let myDateMs = myDate.getMilliseconds();

    //
    let schDate = myDateYear + "-" + myDateMonth + "-" + myDateDay + " " + myDateHour + ":" + myDateMin + ":" + myDateSec + "."+ myDateMs;
    logger.debug("schDate: "+ schDate);

    return (schDate);
}

//
module.exports.txUserSelectReq = async (walletName) => {
    //
    let apiRoutePath  = '/v1/user/select';

    //
    let curTs = Date.now();

    let schCurTs = this.ts2Date(curTs);
    logger.debug("schCurTs: "+ schCurTs);
    
    //
    let sig = await this.genSig(this.schApiKey, schCurTs, this.schSecretKey);

    let reqParam = {
        apiKey : this.schApiKey,
        timestamp : schCurTs,
        version : this.schVer,
        signature : sig, 
        symbol : this.schSymbol,
        addr : walletName
    };

    let postData = JSON.stringify(reqParam);

    logger.info("txUserSelectReq : " + postData);

    //
    let apiRes = await webApi.APICallProc(apiRoutePath, config.SCH_CONFIG, webApi.WEBAPI_DEFINE.METHOD.POST, postData);

    logger.info("apiRes : " + JSON.stringify(apiRes));
}

//
module.exports.txUserInsertReq = async (walletName, accountNum) => {
    //
    let apiRoutePath  = '/v1/user/insert';

    //
    let curTs = Date.now();

    let schCurTs = this.ts2Date(curTs);
    logger.debug("schCurTs: "+ schCurTs);
    
    //
    let sig = await this.genSig(this.schApiKey, schCurTs, this.schSecretKey);

    let reqParam = {
        apiKey : this.schApiKey,
        timestamp : schCurTs,
        version : this.schVer,
        signature : sig, 
        symbol : this.schSymbol,
        addr : walletName, 
        uid : accountNum
    };

    let postData = JSON.stringify(reqParam);

    logger.info("txUserInsertReq : " + postData);

    //
    let apiRes = await webApi.APICallProc(apiRoutePath, config.SCH_CONFIG, webApi.WEBAPI_DEFINE.METHOD.POST, postData);

    logger.info("apiRes : " + JSON.stringify(apiRes));
}

//
module.exports.txUserBuyAddReq = async (userWalletName, purchaseSiteId, nodeWalletName, nftId, nftHash, purchasePrice, userMaxReward, startTs) => {
    //
    let apiRoutePath  = '/v1/user/buyadd';

    //
    let curTs = Date.now();

    let schCurTs = this.ts2Date(curTs);
    logger.debug("schCurTs: "+ schCurTs);
    
    //
    let sig = await this.genSig(this.schApiKey, schCurTs, this.schSecretKey);

    let reqParam = {
        apiKey : this.schApiKey,
        timestamp : schCurTs,
        version : this.schVer,
        signature : sig, 
        symbol : this.schSymbol,
        tid : purchaseSiteId, 
        wid : userWalletName, 
        nftid : nftId, 
        hash : nftHash, 
        price : purchasePrice, 
        maxp : userMaxReward, 
        reward : "0", 
        startday : this.ts2Day(startTs), 
        lastday : this.schLastDay, 
        addr : userWalletName, 
        naddr : nodeWalletName
    };

    let postData = JSON.stringify(reqParam);

    logger.info("txUserBuyAddReq : " + postData);

    //
    let apiRes = await webApi.APICallProc(apiRoutePath, config.SCH_CONFIG, webApi.WEBAPI_DEFINE.METHOD.POST, postData);

    logger.info("apiRes : " + JSON.stringify(apiRes));
}

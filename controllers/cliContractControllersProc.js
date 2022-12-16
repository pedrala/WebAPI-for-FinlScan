//
const fs = require("fs");

//
const cryptoSsl = require("./../../../addon/crypto-ssl");

//
const config = require("./../config/config.js");
const define = require("./../config/define.js");
//
const dbISHandler = require("../src/db/dbISHandler.js");
const dbNNHandler = require("../src/db/dbNNHandler.js");
//
const dbUtil = require("./../src/db/dbUtil.js");
const util = require("./../src/utils/commonUtil.js");
const cryptoUtil = require('./../src/sec/cryptoUtil.js');
const contractProc = require("./../src/contract/contractProc.js");
const webApi = require("./../src/net/webApi.js");
const kafkaHandler = require('./../src/net/kafkaHandler.js');
const logger = require('./../src/utils/winlog.js');
//
const dbFB = require("./../src/db/dbFB.js");
const dbFBHandler = require("./../src/db/dbFBHandler.js");
//
const chkNodeNft = require("./../src/tx/chkNodeNft.js");
//
const contractChecker = require("./../src/contract/contractChecker.js");
const e = require("express");
//

// POST
//
module.exports.inspectContract = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : inspectContract");

    try {
        do
        {
            if(!util.isJsonString(reqQuery))
            {
                logger.error("inspectContract - CONTRACT_ERROR_JSON.JSON_FORMAT");
                ret_msg = { errorCode : define.ERR_MSG.ERR_JSON.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON.MSG}};
                break;
            }

            let contractJson = JSON.parse(reqQuery);

            // logger.debug("CREATE_TM : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CREATE_TM));
            // logger.debug("FINTECH : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FINTECH));
            // logger.debug("PRIVACY : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.PRIVACY));
            // logger.debug("FEE : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FEE));
            // logger.debug("FROM_ACCOUNT : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FROM_ACCOUNT));
            // logger.debug("TO_ACCOUNT : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.TO_ACCOUNT));
            // logger.debug("ACTION : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.ACTION));
            // logger.debug("CONTENTS : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CONTENTS));
            // logger.debug("SIG : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIG));
            // logger.debug("SIGNED_PUPKEY : " + contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIGNED_PUPKEY));

            // check Contract Form
            if(!(contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CREATE_TM)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FINTECH)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.PRIVACY)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FEE)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.FROM_ACCOUNT)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.TO_ACCOUNT)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.ACTION)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.CONTENTS)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIG)
                && contractJson.hasOwnProperty(define.CONTRACT_DEFINE.CONTRACT_PROPERTY.SIGNED_PUPKEY)))
            {
                logger.error("inspectContract - CONTRACT_ERROR_JSON.CONTRACT_FORM");
                ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_PROPERTY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_PROPERTY.MSG}};
                break;
            }

            // Signature Verify Valid
            if (config.CONTRACT_SIG_CHK_MODE === true)
            {
                let verifyResult = false;

                // Verifying Signature
                verifyResult = cryptoUtil.verifySign(contractJson.signed_pubkey, contractJson);
                logger.debug("inspectContract - verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                } 
            }

            if (config.CONTRACT_TEST_MODE === false)
            {
                // Contract Checker
                let retVal = await contractChecker.chkContract(contractJson);
                if (retVal === define.ERR_CODE.ERROR)
                {
                    logger.error("inspectContract - CONTRACT_ERROR_JSON.CONTENT_FORM");
                    contract_error_code = config.CONTRACT_ERROR_JSON.CONTENT_FORM;
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }
            }

            //
            let msg = contractJson;

            //
            //////////////////////////////////////////////////////////////////
            // KAFKA
            // Get Kafka Info
            apiPath = `/kafka/broker/list?all`;
            logger.debug("KAFKA apiPath : " + apiPath);
            apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
            logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

            if (apiRes.errorCode)
            {
                // Error Code
                ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                break;
            }

            let brokerList = apiRes.contents.kafka_list[0].broker_list;
            let topicList = apiRes.contents.kafka_list[0].topic_list;
            let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

            // Set Kafka Info
            kafkaHandler.setMyKafkaInfo(brokerList, topicList);

            //
            kafkaHandler.setMySubNetId(subNetId);

            // Send To Kafka
            // let sentMsg = await kafkaHandler.sendContractMsg(msg);

            if (sentMsg === true)
            {
                ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
            }
        } while (0);
    } catch (err) {
        logger.error("Error - ");
    }

    return (ret_msg);
}

//
module.exports.contractExe = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : contractExe");

    try {
        // User Functionalities
        if (request.hasOwnProperty("addUser"))
        {
            // logger.debug("addUser : " + JSON.stringify(request.addUser));

            let contentsJson = request.addUser;

            ret_msg = await this.addUserProc(contentsJson);
        }
        else if (request.hasOwnProperty("changeUserPubkey"))
        {
            // logger.debug("changeUserPubkey : " + JSON.stringify(request.changeUserPubkey));

            let contentsJson = request.changeUserPubkey;

            ret_msg = await this.changeUserPubkeyProc(contentsJson);
        }
        // Token Functionalities
        else if (request.hasOwnProperty("createToken"))
        {
            // logger.debug("createToken : " + JSON.stringify(request.createToken));

            let contentsJson = request.createToken;

            ret_msg = await this.createTokenProc(contentsJson);
        }
        else if (request.hasOwnProperty("changeTokenPubkey"))
        {
            // logger.debug("changeTokenPubkey : " + JSON.stringify(request.changeTokenPubkey));

            let contentsJson = request.changeTokenPubkey;

            ret_msg = await this.changeTokenPubkeyProc(contentsJson);
        }
        else if (request.hasOwnProperty("changeTokenLockTx"))
        {
            // logger.debug("changeTokenLockTx : " + JSON.stringify(request.changeTokenLockTx));

            let contentsJson = request.changeTokenLockTx;

            ret_msg = await this.changeTokenLockTxProc(contentsJson);
        }
        else if (request.hasOwnProperty("changeTokenLockTime"))
        {
            // logger.debug("changeTokenLockTime : " + JSON.stringify(request.changeTokenLockTime));

            let contentsJson = request.changeTokenLockTime;

            ret_msg = await this.changeTokenLockTimeProc(contentsJson);
        }
        else if (request.hasOwnProperty("changeTokenLockWallet"))
        {
            // logger.debug("changeTokenLockWallet : " + JSON.stringify(request.changeTokenLockWallet));

            let contentsJson = request.changeTokenLockWallet;

            ret_msg = await this.changeTokenLockWalletProc(contentsJson);
        }
        else if (request.hasOwnProperty("txToken"))
        {
            // logger.debug("txToken : " + JSON.stringify(request.txToken));

            let contentsJson = request.txToken;

            ret_msg = await this.txTokenProc(contentsJson);
        }
        else if (request.hasOwnProperty("createSc"))
        {
            // logger.debug("createSc : " + JSON.stringify(request.createSc));

            let contentsJson = request.createSc;

            ret_msg = await this.createScProc(contentsJson);
        }
        else if (request.hasOwnProperty("txSc"))
        {
            // logger.debug("txSc : " + JSON.stringify(request.txSc));

            let contentsJson = request.txSc;

            ret_msg = await this.txScProc(contentsJson);
        }
        else
        {
            ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_UNKNOWN_FORMAT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_UNKNOWN_FORMAT.MSG}};
        }
    } catch (err) {
        logger.error("Error - ");
    }

    return (ret_msg);
}

//
module.exports.addUserProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : addUserProc");

    try {
        if (request.hasOwnProperty("ownerPrikey") && 
            request.hasOwnProperty("ownerPrikeyPw") &&
            request.hasOwnProperty("ownerPubkey") && 
            request.hasOwnProperty("superPubkey") && 
            request.hasOwnProperty("accountId"))
        {
            logger.debug("ownerPrikey : " + request.ownerPrikey);
            logger.debug("ownerPrikeyPw : " + request.ownerPrikeyPw);
            logger.debug("ownerPubkey : " + request.ownerPubkey);
            logger.debug("superPubkey : " + request.superPubkey);
            logger.debug("accountId : " + request.accountId);

            // //
            // let testOwnerPrikeyPath = './' + 'testOwnerPrikey.fin';
            // fs.writeFileSync(testOwnerPrikeyPath, request.ownerPrikey, 'binary');
            // let testOwnerPrikey = fs.readFileSync(testOwnerPrikeyPath, 'binary');

            // logger.debug('request.ownerPrikey : ' + request.ownerPrikey);
            // logger.debug('testOwnerPrikey : ' + testOwnerPrikey);

            do
            {
                //
                let accountIdUpperCase = request.accountId.toUpperCase();
                let regexResult = define.REGEX.ID_REGEX.test(accountIdUpperCase);
                if(!regexResult)
                {
                    logger.debug("ID REGEX Failed : " + regexResult);
                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_REGEX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_REGEX.MSG}};
                    break;
                }

                // Owner Public Key
                //
                if (request.ownerPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.ownerPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Super Public Key
                //
                if (request.superPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.superPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info
                //
                let apiRoutePath = '/account/chk/info';
                let apiKey1 = 'accountIdSimple';
                let apiVal1 = accountIdUpperCase;
                let apiKey2 = 'ownerPubkeySimple';
                let apiVal2 = request.ownerPubkey;
                let apiKey3 = 'superPubkeySimple';
                let apiVal3 = request.superPubkey;

                // //
                // let apiVal2Enc = encodeURIComponent(apiVal2);
        
                // //
                // let apiVal2Dec = encodeURIComponent(apiVal2Enc);
                // logger.debug("apiVal2Dec : " + apiVal2Dec);
        
                //
                let apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}&${apiKey2}=${apiVal2}&${apiKey3}=${apiVal3}`;
                logger.debug("apiPath : " + apiPath);
        
                //
                let apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (!apiRes.errorCode) // Existed
                {
                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_EXIST_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_EXIST_DATA.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                let tcAddUser = await contractProc.cAddUser(request.ownerPubkey, request.superPubkey, accountIdUpperCase, request.ownerPrikey, request.ownerPrikeyPw);
                logger.debug("tcAddUser : " + JSON.stringify(tcAddUser));
                // let contractJson = JSON.stringify(tcAddUser);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcAddUser.signed_pubkey, tcAddUser);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcAddUser;

                //////////////////////////////////////////////////////////////////
                //
                // get data from fb.repl_info
                let query_result = await dbFBHandler.getReplData();
                let fbSubNetIdHex = query_result[0].subnet_id;
                let fbSubNetId = parseInt(fbSubNetIdHex, 16);
                logger.debug("query_result : " + fbSubNetId);

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                // apiPath = `/kafka/broker/list?all`;
                apiPath = `/kafka/broker/list?subNetId=${fbSubNetId}`;
                logger.info("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.info("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    logger.error("KAFKA List Error");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};
    }

    return (ret_msg);
}

//
module.exports.changeUserPubkeyProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : changeUserPubkeyProc");

    try {
        if (request.hasOwnProperty("ownerPubkey") && 
            request.hasOwnProperty("superPubkey") && 
            request.hasOwnProperty("accountId") && 
            request.hasOwnProperty("regSuperPrikey") && 
            request.hasOwnProperty("regSuperPrikeyPw") && 
            request.hasOwnProperty("regSuperPubkey"))
        {
            logger.debug("ownerPubkey : " + request.ownerPubkey);
            logger.debug("superPubkey : " + request.superPubkey);
            logger.debug("accountId : " + request.accountId);
            logger.debug("regSuperPrikey : " + request.regSuperPrikey);
            logger.debug("regSuperPrikeyPw : " + request.regSuperPrikeyPw);
            logger.debug("regSuperPubkey : " + request.regSuperPubkey);

            do
            {
                // Owner Public Key
                //
                if (request.ownerPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.ownerPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Super Public Key
                //
                if (request.superPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.superPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Registered Super Public Key
                //
                if (request.regSuperPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.regSuperPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info 1
                //
                let apiRoutePath = '/account/chk/info';
                let apiPath;
                let apiRes;

                //
                let apiKey2 = 'ownerPubkeySimple';
                let apiVal2 = request.ownerPubkey;
                let apiKey3 = 'superPubkeySimple';
                let apiVal3 = request.superPubkey;

                // //
                // let apiVal2Enc = encodeURIComponent(apiVal2);
        
                // //
                // let apiVal2Dec = encodeURIComponent(apiVal2Enc);
                // logger.debug("apiVal2Dec : " + apiVal2Dec);
        
                //
                apiPath = `${apiRoutePath}?${apiKey2}=${apiVal2}&${apiKey3}=${apiVal3}`;
                logger.debug("apiPath : " + apiPath);
        
                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if ((!apiRes.errorCode) && 
                    (apiRes.contents.hasOwnProperty("uAccountInfo")) &&
                    (request.accountId != apiRes.contents.uAccountInfo.account_id)) // Existed
                {
                    // Error Code
                    logger.debug("One of pubkey is already existed.");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_EXIST_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_EXIST_PUBKEY.MSG}};
                    break;
                }
                //////////////////////////////////////////////////////////////////

                //////////////////////////////////////////////////////////////////
                // Check Info 2
                //
                // let apiRoutePath = '/account/chk/info';
                //
                let apiKey1 = 'accountIdSimple';
                let apiVal1 = request.accountId;

                //
                apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);
        
                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (apiRes.errorCode) // NOT Existed
                {
                    logger.debug("Account Id does NOT existed.");

                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                if (apiRes.contents.uAccountInfo.super_pk !== request.regSuperPubkey)
                {
                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                if ((apiRes.contents.uAccountInfo.owner_pk === request.ownerPubkey) && 
                    (apiRes.contents.uAccountInfo.super_pk === request.superPubkey))
                {
                    logger.debug("Requested pubkey is eqauls to previous keys.");

                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                let accountNum = apiRes.contents.uAccountInfo.account_num;
                //////////////////////////////////////////////////////////////////

                //
                let accountNumHexStr = BigInt(accountNum).toString(16);

                let tcChangeUserPk = await contractProc.cChangeUserPk(accountNumHexStr, request.ownerPubkey, request.superPubkey, request.accountId, request.regSuperPubkey, request.regSuperPrikey, request.regSuperPrikeyPw);

                if (tcChangeUserPk === false)
                {
                    logger.error("Change User Pubkey Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcChangeUserPk : " + JSON.stringify(tcChangeUserPk));
                // let contractJson = JSON.stringify(tcChangeUserPk);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcChangeUserPk.signed_pubkey, tcChangeUserPk);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcChangeUserPk;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.createTokenProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : createTokenProc");

    try {
        if (request.hasOwnProperty("ownerPrikey") && 
            request.hasOwnProperty("ownerPrikeyPw") &&
            request.hasOwnProperty("ownerPubkey") && 
            request.hasOwnProperty("superPubkey") && 
            // request.hasOwnProperty("tokenAction"))
            request.hasOwnProperty("tokenAction") &&
            request.hasOwnProperty("tokenName") && 
            request.hasOwnProperty("tokenSymbol") && 
            request.hasOwnProperty("totalSupply") && 
            request.hasOwnProperty("decimalPoint"))
            // request.hasOwnProperty("decimalPoint") && 
            // request.hasOwnProperty("lockTimeFrom") && 
            // request.hasOwnProperty("lockTimeTo") && 
            // request.hasOwnProperty("lockTransfer") && 
            // request.hasOwnProperty("blackList") && 
            // request.hasOwnProperty("functions"))
        {
            logger.debug("ownerPrikey : " + request.ownerPrikey);
            logger.debug("ownerPrikeyPw : " + request.ownerPrikeyPw);
            logger.debug("ownerPubkey : " + request.ownerPubkey);
            logger.debug("superPubkey : " + request.superPubkey);
            logger.debug("tokenAction : " + request.tokenAction);
            logger.debug("tokenName : " + request.tokenName);
            logger.debug("tokenSymbol : " + request.tokenSymbol);
            logger.debug("totalSupply : " + request.totalSupply);
            logger.debug("decimalPoint : " + request.decimalPoint);

            do
            {
                //////////////////////////////////////////////////////////////////
                // Super Public Key
                //
                if (request.ownerPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.ownerPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Super Public Key
                //
                if (request.superPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.superPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check reg_token Info
                let apiRoutePath = '/net/token/check';
                let apiKey1;
                let apiVal1;

                if (request.hasOwnProperty("tokenAction"))
                {
                    if (isNaN(request.tokenAction))
                    {
                        //
                    }
                    else
                    {
                        apiKey1 = "tokenAction"
                        apiVal1 = request.tokenAction;
                    }
                }
                else if (request.hasOwnProperty("tokenSymbol"))
                {
                    if (!isNaN(request.tokenSymbol))
                    {
                        //
                    }
                    else
                    {
                        apiKey1 = "tokenSymbol"
                        apiVal1 = request.tokenSymbol;
                    }
                }
                else if (request.hasOwnProperty("tokenName"))
                {
                    if (!isNaN(request.tokenName))
                    {
                        //
                    }
                    else
                    {
                        apiKey1 = "tokenName"
                        apiVal1 = request.tokenName;
                    }
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};
                }

                let apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);
        
                //
                let apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                // Registered Token
                if (!apiRes.errorCode)
                {
                    //////////////////////////////////////////////////////////////////
                    // Check Info
                    //
                    apiRoutePath = '/account/chk/info';
                    apiKey1 = 'tokenAction';
                    apiVal1 = request.tokenAction;

                    let apiKey2 = 'ownerPubkeySimple';
                    let apiVal2 = request.ownerPubkey;
                    let apiKey3 = 'superPubkeySimple';
                    let apiVal3 = request.superPubkey;
                    // //
                    // let apiVal2Enc = encodeURIComponent(apiVal2);

                    // //
                    // let apiVal2Dec = encodeURIComponent(apiVal2Enc);
                    // logger.debug("apiVal2Dec : " + apiVal2Dec);

                    //
                    apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}&${apiKey2}=${apiVal2}&${apiKey3}=${apiVal3}`;
                    logger.debug("apiPath : " + apiPath);
                    
                    //
                    apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                    logger.debug("apiRes : " + JSON.stringify(apiRes));
                    if (!apiRes.errorCode)
                    {
                        // Error Code
                        ret_msg = { errorCode : define.ERR_MSG.ERR_EXIST_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_EXIST_DATA.MSG}};
                        break;
                    }
                    //////////////////////////////////////////////////////////////////

                    //
                    let tokenAction = parseInt(request.tokenAction);
                    let tokenName = request.tokenName;
                    let tokenSymbol = request.tokenSymbol;
                    let totalSupply = request.totalSupply;
                    let decimalPoint = parseInt(request.decimalPoint);
                    // let tokenName = "UTIL" + tokenAction.toString();
                    // let tokenSymbol = "f" + tokenAction.toString();
                    // let totalSupply = "1000000000.000000000";
                    // let decimalPoint = define.CONTRACT_DEFINE.NANO_DECIMAL_POINT;

                    // 
                    let tcCreateT = await contractProc.cCreateToken(request.ownerPubkey, request.superPubkey, request.ownerPrikey, request.ownerPrikeyPw, 
                                                        tokenAction, tokenName, tokenSymbol, totalSupply, decimalPoint);

                    if (tcCreateT === false)
                    {
                        logger.error("Contract Creation Is Invalid");
                        ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                        break;
                    }

                    logger.debug("tcCreateT : " + JSON.stringify(tcCreateT));
                    // let contractJson = JSON.stringify(tcCreateT);

                    // Verifying Signature
                    let verifyResult = cryptoUtil.verifySign(tcCreateT.signed_pubkey, tcCreateT);
                    logger.debug("verifyResult : " + verifyResult);

                    if (verifyResult === false)
                    {
                        logger.error("Signature Is Invalid(Verify failed)");
                        break;
                    }

                    //
                    let msg = tcCreateT;

                    //////////////////////////////////////////////////////////////////
                    //
                    // get data from fb.repl_info
                    let query_result = await dbFBHandler.getReplData();
                    let fbSubNetIdHex = query_result[0].subnet_id;
                    let fbSubNetId = parseInt(fbSubNetIdHex, 16);
                    logger.debug("query_result : " + fbSubNetId);

                    //////////////////////////////////////////////////////////////////
                    // KAFKA
                    // Get Kafka Info
                    // apiPath = `/kafka/broker/list?all`;
                    apiPath = `/kafka/broker/list?subNetId=${fbSubNetId}`;
                    logger.debug("KAFKA apiPath : " + apiPath);
                    apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                    logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                    if (apiRes.errorCode)
                    {
                        // Error Code
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                        break;
                    }

                    let brokerList = apiRes.contents.kafka_list[0].broker_list;
                    let topicList = apiRes.contents.kafka_list[0].topic_list;
                    let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                    // Set Kafka Info
                    kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                    //
                    kafkaHandler.setMySubNetId(subNetId);

                    // Send To Kafka
                    let sentMsg = await kafkaHandler.sendContractMsg(msg);
                    if (sentMsg === true)
                    {
                        ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                    }
                    else
                    {
                        ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                    }
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.changeTokenPubkeyProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : changeTokenPubkeyProc");

    try {
        if (request.hasOwnProperty("ownerPubkey") && 
            request.hasOwnProperty("superPubkey") && 
            request.hasOwnProperty("tokenAction") && 
            request.hasOwnProperty("regSuperPrikey") && 
            request.hasOwnProperty("regSuperPrikeyPw") && 
            request.hasOwnProperty("regSuperPubkey"))
        {
            logger.debug("ownerPubkey : " + request.ownerPubkey);
            logger.debug("superPubkey : " + request.superPubkey);
            logger.debug("tokenAction : " + request.tokenAction);
            logger.debug("regSuperPrikey : " + request.regSuperPrikey);
            logger.debug("regSuperPrikeyPw : " + request.regSuperPrikeyPw);
            logger.debug("regSuperPubkey : " + request.regSuperPubkey);

            do
            {
                // Owner Public Key
                //
                if (request.ownerPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.ownerPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Super Public Key
                //
                if (request.superPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.superPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // Registered Super Public Key
                //
                if (request.regSuperPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.regSuperPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info 1
                //
                let apiRoutePath = '/account/chk/info';
                let apiPath;
                let apiRes;

                //
                let apiKey2 = 'ownerPubkeySimple';
                let apiVal2 = request.ownerPubkey;
                let apiKey3 = 'superPubkeySimple';
                let apiVal3 = request.superPubkey;

                // //
                // let apiVal2Enc = encodeURIComponent(apiVal2);
        
                // //
                // let apiVal2Dec = encodeURIComponent(apiVal2Enc);
                // logger.debug("apiVal2Dec : " + apiVal2Dec);
        
                //
                apiPath = `${apiRoutePath}?${apiKey2}=${apiVal2}&${apiKey3}=${apiVal3}`;
                logger.debug("apiPath : " + apiPath);
        
                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if ((!apiRes.errorCode) && 
                    (apiRes.contents.hasOwnProperty("tAccountInfo")) &&
                    (request.tokenAction != apiRes.contents.tAccountInfo.action)) // Existed
                {
                    // Error Code
                    logger.debug("One of pubkey is already existed.");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_EXIST_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_EXIST_PUBKEY.MSG}};
                    break;
                }
                //////////////////////////////////////////////////////////////////

                //////////////////////////////////////////////////////////////////
                // Check Info 2
                //
                let apiKey1 = 'tokenAction';
                let apiVal1 = request.tokenAction;

                //
                apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);

                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (apiRes.errorCode)
                {
                    // Error Code
                    logger.error("tokenAction 1");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN.MSG}};
                    break;
                }

                if (apiRes.contents.tAccountInfo.super_pk !== request.regSuperPubkey)
                {
                    // Error Code
                    logger.error("tokenAction 2");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                    break;
                }

                if ((apiRes.contents.tAccountInfo.owner_pk === request.ownerPubkey) && 
                    (apiRes.contents.tAccountInfo.super_pk === request.superPubkey))
                {
                    // Error Code
                    logger.error("tokenAction 3");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                    break;
                }

                let accountNum = apiRes.contents.tAccountInfo.account_num;
                //////////////////////////////////////////////////////////////////

                //
                let accountNumHexStr = BigInt(accountNum).toString(16);

                let tcChangeTokenPk = await contractProc.cChangeTokenPk(accountNumHexStr, request.ownerPubkey, request.superPubkey, request.tokenAction, request.regSuperPubkey, request.regSuperPrikey, request.regSuperPrikeyPw);

                if (tcChangeTokenPk === false)
                {
                    logger.error("Change Token Pubkey Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcChangeTokenPk : " + JSON.stringify(tcChangeTokenPk));
                // let contractJson = JSON.stringify(tcChangeTokenPk);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcChangeTokenPk.signed_pubkey, tcChangeTokenPk);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcChangeTokenPk;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.changeTokenLockTxProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : changeTokenLockTxProc");

    try {
        if (request.hasOwnProperty("tokenAction") && 
            request.hasOwnProperty("lockTx") && 
            request.hasOwnProperty("regSuperPrikey") && 
            request.hasOwnProperty("regSuperPrikeyPw") && 
            request.hasOwnProperty("regSuperPubkey"))
        {
            logger.debug("tokenAction : " + request.tokenAction);
            logger.debug("lockTx : " + request.lockTx);
            logger.debug("regSuperPrikey : " + request.regSuperPrikey);
            logger.debug("regSuperPrikeyPw : " + request.regSuperPrikeyPw);
            logger.debug("regSuperPubkey : " + request.regSuperPubkey);

            do
            {
                // Registered Super Public Key
                //
                if (request.regSuperPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.regSuperPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // 
                if (isNaN(request.lockTx))
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.MSG}};
                    break;
                }

                if (Number(request.lockTx) > Number(define.CONTRACT_DEFINE.LOCK_TOKEN_TX.MAX))
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info
                let apiRoutePath = '/account/chk/info';
                let apiPath;
                let apiRes;

                //
                let apiKey1 = 'tokenAction';
                let apiVal1 = request.tokenAction;

                //
                apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);

                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (apiRes.errorCode)
                {
                    // Error Code
                    logger.error("tokenAction 1");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN.MSG}};
                    break;
                }

                if (apiRes.contents.tAccountInfo.super_pk !== request.regSuperPubkey)
                {
                    // Error Code
                    logger.error("tokenAction 2");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                    break;
                }

                let accountNum = apiRes.contents.tAccountInfo.account_num;
                //////////////////////////////////////////////////////////////////

                //
                let accountNumHexStr = BigInt(accountNum).toString(16);

                let tcChangeTokenLockTx = await contractProc.cChangeTokenLockTx(accountNumHexStr, request.tokenAction, request.lockTx, request.regSuperPubkey, request.regSuperPrikey, request.regSuperPrikeyPw);

                if (tcChangeTokenLockTx === false)
                {
                    logger.error("Change Token Lock Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcChangeTokenLockTx : " + JSON.stringify(tcChangeTokenLockTx));
                // let contractJson = JSON.stringify(tcChangeTokenLockTx);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcChangeTokenLockTx.signed_pubkey, tcChangeTokenLockTx);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcChangeTokenLockTx;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.changeTokenLockTimeProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : changeTokenLockTimeProc");

    try {
        if (request.hasOwnProperty("tokenAction") && 
            request.hasOwnProperty("lockTimeFrom") && 
            request.hasOwnProperty("lockTimeTo") && 
            request.hasOwnProperty("regSuperPrikey") && 
            request.hasOwnProperty("regSuperPrikeyPw") && 
            request.hasOwnProperty("regSuperPubkey"))
        {
            logger.debug("tokenAction : " + request.tokenAction);
            logger.debug("lockTimeFrom : " + request.lockTimeFrom);
            logger.debug("lockTimeTo : " + request.lockTimeTo);
            logger.debug("regSuperPrikey : " + request.regSuperPrikey);
            logger.debug("regSuperPrikeyPw : " + request.regSuperPrikeyPw);
            logger.debug("regSuperPubkey : " + request.regSuperPubkey);

            do
            {
                // Registered Super Public Key
                //
                if (request.regSuperPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN)
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_LEN.MSG}};
                    break;
                }

                //
                if (request.regSuperPubkey.slice(0,2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER)
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY_DELI.MSG}};
                    break;
                }

                // 
                if (isNaN(request.lockTimeFrom))
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.MSG}};
                    break;
                }

                if (Number(request.lockTimeFrom) && (Number(request.lockTimeFrom) < Date.now()))
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.MSG}};
                    break;
                }

                //
                if (isNaN(request.lockTimeTo))
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON_INVALID_PROPERTY.MSG}};
                    break;
                }

                if (Number(request.lockTimeTo) < Number(request.lockTimeFrom))
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                if (!Number(request.lockTimeFrom) && Number(request.lockTimeTo) && (Number(request.lockTimeTo) < Date.now()))
                {
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info
                let apiRoutePath = '/account/chk/info';
                let apiPath;
                let apiRes;

                //
                let apiKey1 = 'tokenAction';
                let apiVal1 = request.tokenAction;

                //
                apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);

                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (apiRes.errorCode)
                {
                    // Error Code
                    logger.error("tokenAction 1");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN.MSG}};
                    break;
                }

                if (apiRes.contents.tAccountInfo.super_pk !== request.regSuperPubkey)
                {
                    // Error Code
                    logger.error("tokenAction 2");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                    break;
                }

                let accountNum = apiRes.contents.tAccountInfo.account_num;
                //////////////////////////////////////////////////////////////////

                //
                let accountNumHexStr = BigInt(accountNum).toString(16);

                let tcChangeTokenLockTime = await contractProc.cChangeTokenLockTime(accountNumHexStr, request.tokenAction, request.lockTimeFrom, request.lockTimeTo, request.regSuperPubkey, request.regSuperPrikey, request.regSuperPrikeyPw);

                if (tcChangeTokenLockTime === false)
                {
                    logger.error("Change Token Lock Time Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcChangeTokenLockTime : " + JSON.stringify(tcChangeTokenLockTime));
                // let contractJson = JSON.stringify(tcChangeTokenLockTime);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcChangeTokenLockTime.signed_pubkey, tcChangeTokenLockTime);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcChangeTokenLockTime;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.changeTokenLockWalletProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : changeTokenLockWalletProc");

    try {
        if (request.hasOwnProperty("tokenAction") && 
            request.hasOwnProperty("blackPkList") && 
            request.hasOwnProperty("whitePkList") && 
            request.hasOwnProperty("regSuperPrikey") && 
            request.hasOwnProperty("regSuperPrikeyPw") && 
            request.hasOwnProperty("regSuperPubkey"))
        {
            logger.debug("tokenAction : " + request.tokenAction);
            logger.debug("blackPkList : " + request.blackPkList);
            logger.debug("whitePkList : " + request.whitePkList);
            logger.debug("regSuperPrikey : " + request.regSuperPrikey);
            logger.debug("regSuperPrikeyPw : " + request.regSuperPrikeyPw);
            logger.debug("regSuperPubkey : " + request.regSuperPubkey);

            do
            {
                // Registered Super Public Key
                //
                if (request.regSuperPubkey.length !== define.SEC_DEFINE.PUBLIC_KEY_LEN) {
                    ret_msg = { errorCode: define.ERR_MSG.ERR_PUBKEY_LEN.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_PUBKEY_LEN.MSG } };
                    break;
                }

                //
                if (request.regSuperPubkey.slice(0, 2) !== define.SEC_DEFINE.KEY_DELIMITER.ED25519_DELIMITER) {
                    ret_msg = { errorCode: define.ERR_MSG.ERR_PUBKEY_DELI.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_PUBKEY_DELI.MSG } };
                    break;
                }

                // 
                if (!util.isJsonString(request.blackPkList)) {
                    ret_msg = { errorCode: define.ERR_MSG.ERR_JSON.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_JSON.MSG } };
                    break;
                }

                // 
                if (!util.isJsonString(request.whitePkList)) {
                    ret_msg = { errorCode: define.ERR_MSG.ERR_JSON.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_JSON.MSG } };
                    break;
                }

                //////////////////////////////////////////////////////////////////
                // Check Info
                let apiRoutePath = '/account/chk/info';
                let apiPath;
                let apiRes;

                //
                let apiKey1 = 'tokenAction';
                let apiVal1 = request.tokenAction;

                //
                apiPath = `${apiRoutePath}?${apiKey1}=${apiVal1}`;
                logger.debug("apiPath : " + apiPath);

                //
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (apiRes.errorCode) {
                    // Error Code
                    logger.error("tokenAction 1");
                    ret_msg = { errorCode: define.ERR_MSG.ERR_TOKEN.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_TOKEN.MSG } };
                    break;
                }

                if (apiRes.contents.tAccountInfo.super_pk !== request.regSuperPubkey) {
                    // Error Code
                    logger.error("tokenAction 2");
                    ret_msg = { errorCode: define.ERR_MSG.ERR_PUBKEY.CODE, contents: { res: false, msg: define.ERR_MSG.ERR_PUBKEY.MSG } };
                    break;
                }

                let accountNum = apiRes.contents.tAccountInfo.account_num;
                //////////////////////////////////////////////////////////////////

                //
                let accountNumHexStr = BigInt(accountNum).toString(16);

                let tcChangeTokenLockWallet = await contractProc.cChangeTokenLockWallet(accountNumHexStr, request.tokenAction, request.blackPkList, request.whitePkList, request.regSuperPubkey, request.regSuperPrikey, request.regSuperPrikeyPw);

                if (tcChangeTokenLockWallet === false)
                {
                    logger.error("Change Token Wallet Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcChangeTokenLockWallet : " + JSON.stringify(tcChangeTokenLockWallet));
                // let contractJson = JSON.stringify(tcChangeTokenLockWallet);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcChangeTokenLockWallet.signed_pubkey, tcChangeTokenLockWallet);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcChangeTokenLockWallet;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.txTokenProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : txTokenProc");

    try {
        if (request.hasOwnProperty("tAccountAction") && 
            request.hasOwnProperty("fromAccount") && 
            request.hasOwnProperty("toAccount") &&
            request.hasOwnProperty("amount") &&
            request.hasOwnProperty("ownerPrikey") &&
            request.hasOwnProperty("ownerPrikeyPw") && 
            request.hasOwnProperty("ownerPubkey"))
        {
            logger.debug("tAccountAction : " + request.tAccountAction);
            logger.debug("fromAccount : " + request.fromAccount);
            logger.debug("toAccount : " + request.toAccount);
            logger.debug("amount : " + request.amount);
            logger.debug("ownerPrikey : " + request.ownerPrikey);
            logger.debug("ownerPrikeyPw : " + request.ownerPrikeyPw);
            logger.debug("ownerPubkey : " + request.ownerPubkey);

            do
            {
                //
                let apiPath;
                let apiRes;

                //
                let decimal_point;
                let subNetId;
                let fromAccount;
                let toAccount;
                let tokenAccount;

                // Check Account Action // Token Number 
                let tAccountInfo = await dbNNHandler.getTokenInfoByTokenAccountAction(request.tAccountAction);
                if (tAccountInfo === false)
                {
                    // Error Code
                    logger.debug("Error - Check Account Action");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN.MSG}};
                    break;
                }

                if (Number(tAccountInfo.lock_time_from) <= Date.now() && Date.now() <= Number(tAccountInfo.lock_time_to)) {
                    logger.error("Error - TX LOCK : TIME LOCK");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_LOCK_TOKEN_TIME.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_LOCK_TOKEN_TIME.MSG}};
                    break;
                }

                if (tAccountInfo.lock_transfer === define.CONTRACT_DEFINE.LOCK_TOKEN_TX.LOCK_ALL) {
                    logger.error("Error - TX LOCK : LOCK_ALL");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_LOCK_TOKEN_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_LOCK_TOKEN_TX.MSG}};
                    break;
                }

                decimal_point = tAccountInfo.decimal_point;
                logger.debug("decimal_point : " + decimal_point);

                // Check Decimal Point
                let splitNum = util.chkDecimalPoint(request.amount);
                if ((splitNum.length !== 2) || splitNum[1].length !== decimal_point)
                {
                    // Error Code
                    logger.debug("Error - Check Decimal Point");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }

                // Token Account
                tokenAccount = tAccountInfo.account_num;

                // Check From Account
                // if (request.ownerPubkey === cryptoUtil.getIsPubkey())
                // if (request.tAccountAction === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                if ((Number(request.tAccountAction) === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN) && (request.ownerPubkey === tAccountInfo.owner_pk))
                {
                    //
                    fromAccount = tAccountInfo.account_num;

                    subNetId = tAccountInfo.subnet_id;
                    logger.debug("subNetId : " + subNetId);

                    // Check Owner Public Key
                    logger.debug("tAccountInfo.owner_pk : " + tAccountInfo.owner_pk);
                    logger.debug("request.ownerPubkey   : " + request.ownerPubkey);
                    // if (tAccountInfo.owner_pk !== request.ownerPubkey)
                    // {
                    //     // Error Code
                    //     ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                    //     break;
                    // }
                }
                else
                {
                    if (request.fromAccount === define.CONTRACT_DEFINE.FROM_DEFAULT)
                    {
                        // // Check Security Token
                        // if (Number(request.tAccountAction) === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                        // {
                        //     // Error Code
                        //     logger.debug("Error -  Check Utility Token");
                        //     break;
                        // }

                        // fromAccount = request.fromAccount;
                        fromAccount = tokenAccount;
                        logger.debug("fromAccount : " + fromAccount);

                        subNetId = tAccountInfo.subnet_id;
                        logger.debug("subNetId : " + subNetId);

                        // Check Owner Public Key
                        logger.debug("tAccountInfo.owner_pk : " + tAccountInfo.owner_pk);
                        logger.debug("request.ownerPubkey   : " + request.ownerPubkey);
                        // if (tAccountInfo.owner_pk !== request.ownerPubkey)
                        // {
                        //     // Error Code
                        //     ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                        //     break;
                        // }
                    }
                    else
                    {
                        //
                        if (tAccountInfo.lock_transfer === define.CONTRACT_DEFINE.LOCK_TOKEN_TX.LOCK_EXC_OWNER) {
                            logger.error("Error - TX LOCK : LOCK_EXC_OWNER");
                            ret_msg = { errorCode : define.ERR_MSG.ERR_LOCK_TOKEN_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_LOCK_TOKEN_TX.MSG}};
                            break;
                        }

                        let uFromAccountInfo;
                        if(isNaN(request.fromAccount))
                        {
                            uFromAccountInfo = await dbNNHandler.getUserAccountByAccountId(request.fromAccount);
                        }
                        else
                        {
                            uFromAccountInfo = await dbNNHandler.getUserAccountByAccountNum(request.fromAccount);
                        }

                        if (uFromAccountInfo === false)
                        {
                            // Error Code
                            logger.error("None User Account Info");
                            ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                            break;
                        } 

                        //
                        // fromAccount = request.fromAccount;
                        fromAccount = uFromAccountInfo.account_num;
                        
                        if (tAccountInfo.black_list) {
                            let blackListAll = JSON.parse(tAccountInfo.black_list);
                            let blackListAccNum = blackListAll.black_acc_num_list;
                            let isBlackList = blackListAccNum.indexOf(fromAccount);
                    
                            if (isBlackList > -1 && fromAccount == blackListAccNum[isBlackList]) {
                                // Error Code
                                logger.error("User Account is on Black List");
                                ret_msg =  { errorCode : define.ERR_MSG.ERR_LOCK_TOKEN_WALLET.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_LOCK_TOKEN_WALLET.MSG}};
                                break;
                            }
                        }
                        logger.debug("fromAccount : " + fromAccount);

                        subNetId = uFromAccountInfo.subnet_id;
                        logger.debug("subNetId : " + subNetId);

                        // Check Owner Public Key
                        logger.debug("uFromAccountInfo.owner_pk : " + uFromAccountInfo.owner_pk);
                        logger.debug("request.ownerPubkey   : " + request.ownerPubkey);
                        // if (uFromAccountInfo.owner_pk !== request.ownerPubkey)
                        // {
                        //     // Error Code
                        //     ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                        //     break;
                        // }
                    }
                }

                //
                let scContentsInfo = await dbNNHandler.getScContentsByFromAccountNum(fromAccount);
                if (scContentsInfo !== false)
                {
                    if (scContentsInfo.confirmed === 0)
                    {
                        // Error Code
                        logger.error("Contract Error : Unconfirmed Contract is existed");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                        break;
                    }
                }

                //
                let uToAccountInfo;
                if(isNaN(request.toAccount))
                {
                    uToAccountInfo = await dbNNHandler.getUserAccountByAccountId(request.toAccount);
                }
                else
                {
                    uToAccountInfo = await dbNNHandler.getUserAccountByAccountNum(request.toAccount);
                }

                if (uToAccountInfo === false)
                {
                    // Error Code
                    logger.error("None User Account Info");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                } 

                // toAccount = request.toAccount;
                toAccount = uToAccountInfo.account_num;

                if (tAccountInfo.black_list) {
                    let blackListAll = JSON.parse(tAccountInfo.black_list);
                    let blackListAccNum = blackListAll.black_acc_num_list;
                    let isBlackList = blackListAccNum.indexOf(toAccount);
            
                    if (isBlackList > -1 && toAccount == blackListAccNum[isBlackList]) {
                        // Error Code
                        logger.error("User Account is on Black List");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_LOCK_TOKEN_WALLET.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_LOCK_TOKEN_WALLET.MSG}};
                        break;
                    }
                }

                toSubNetId = uToAccountInfo.subnet_id;
                logger.debug("toAccount : " + toAccount);
                logger.debug("toSubNetId : " + toSubNetId);

                // Check Balance
                // if (request.ownerPubkey === cryptoUtil.getIsPubkey())
                if (Number(request.tAccountAction) === define.CONTRACT_DEFINE.ACTIONS.TOKEN.SECURITY_TOKEN)
                {
                    //
                    logger.debug("request.tAccountAction === SECURITY_TOKEN");
                }
                else
                {
                    let myBal = await dbNNHandler.getAccountBalanceByAccountNumAndAction(fromAccount, request.tAccountAction);
                    if (myBal !== define.ERR_CODE.ERROR)
                    {
                        if (Number(myBal.balance) >= Number(request.amount))
                        {
                            //
                        }
                        else
                        {
                            // Error Code
                            logger.debug("Error -  request.amount");
                            ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN_BALANCE.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN_BALANCE.MSG}};
                            break;
                        }
                    }
                    else
                    {
                        // Error Code
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN_INFO.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN_INFO.MSG}};
                        break;
                    }
                }

                //
                let fromAccountHexStr = BigInt(fromAccount).toString(16);
                let toAccountHexStr = BigInt(toAccount).toString(16);
                let tokenAccountHexStr = BigInt(tokenAccount).toString(16);

                logger.debug("fromAccountHexStr : " + fromAccountHexStr);
                logger.debug("toAccountHexStr : " + toAccountHexStr);
                logger.debug("Number(request.tAccountAction) : " + Number(request.tAccountAction));
                logger.debug("request.amount : " + request.amount);
                logger.debug("request.ownerPubkey : " + request.ownerPubkey);
                logger.debug("request.ownerPrikey : " + request.ownerPrikey);
                logger.debug("request.ownerPrikeyPw : " + request.ownerPrikeyPw);

                if (fromAccountHexStr === toAccountHexStr)
                {
                    // Error Code
                    logger.debug("Error -  Check fromAccount & toAccount");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                    break;
                }

                let tcTxToken = await contractProc.cTxToken2(fromAccountHexStr, toAccountHexStr, tokenAccountHexStr, Number(request.tAccountAction), request.amount, request.ownerPubkey, request.ownerPrikey, request.ownerPrikeyPw);

                if (tcTxToken === false)
                {
                    logger.error("Token Transfer Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcTxToken : " + JSON.stringify(tcTxToken));
                // let contractJson = JSON.stringify(tcTxToken);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcTxToken.signed_pubkey, tcTxToken);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcTxToken;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                let likeTopic = Number(subNetId).toString(16);
                // logger.debug("likeTopic : " + likeTopic);
        
                let kafkaInfo = await dbISHandler.getKafkaInfoByLikeTopic(likeTopic);
                if (!kafkaInfo.length)
                {
                    // Error Code
                    logger.error("None Kafka List accourding to subNetId : " + subNetId);
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = kafkaInfo[0].broker_list;
                let topicList = kafkaInfo[0].topic_list;

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.createScProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : createScProc");

    try {
        if (request.hasOwnProperty("scAction") && 
            request.hasOwnProperty("actionTarget") && 
            request.hasOwnProperty("sc") &&
            request.hasOwnProperty("ownerPrikey") &&
            request.hasOwnProperty("ownerPrikeyPw") && 
            request.hasOwnProperty("ownerPubkey"))
        {
            logger.debug("scAction : " + request.scAction);
            logger.debug("actionTarget : " + request.actionTarget);
            logger.debug("sc : " + request.sc);
            logger.debug("ownerPrikey : " + request.ownerPrikey);
            logger.debug("ownerPrikeyPw : " + request.ownerPrikeyPw);
            logger.debug("ownerPubkey : " + request.ownerPubkey);

            do
            {
                //
                let apiPath;
                let apiRes;

                //
                if(!util.isJsonString(request.sc))
                {
                    // Error Code
                    logger.error("Error -  Invalid sc json value");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_JSON.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_JSON.MSG}};
                    break;
                }

                // Check SC Action
                //
                if ((Number(request.scAction) < define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT) ||
                    (Number(request.scAction) > define.CONTRACT_DEFINE.ACTIONS.CONTRACT.NFT.END))
                {
                    // Error Code
                    logger.error("Error -  Invalid SC Action Range");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_INVALID_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_INVALID_DATA.MSG}};
                    break;
                }
                //
                apiPath = `/account/chk/cnt?scAction=${request.scAction}`;
                logger.debug("apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                if (!apiRes.errorCode) // Existed
                {
                    if (Number(apiRes.contents.totalScActionCnt))
                    {
                        // Error Code
                        logger.error("Error -  Check SC Action");
                        ret_msg = { errorCode : define.ERR_MSG.ERR_EXIST_SC_ACTION.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_EXIST_SC_ACTION.MSG}};
                        break;
                    }
                }

                // Check Action Target
                // Create SC
                if (request.actionTarget <= define.CONTRACT_DEFINE.ACTIONS.TOKEN.UTILITY_TOKEN_MAX)
                {
                    apiPath = `/account/list?tAccountAction=${request.actionTarget}`;
                    logger.debug("apiPath : " + apiPath);
                    apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                    logger.debug("apiRes : " + JSON.stringify(apiRes));
                    if (apiRes.errorCode) // Not Existed
                    {
                        // Error Code
                        logger.error("Error -  Check Action Target");
                        ret_msg = { errorCode : define.ERR_MSG.ERR_SC_ACTION.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_SC_ACTION.MSG}};
                        break;
                    }
    
                    if (apiRes.contents.tAccountInfo.owner_pk !== request.ownerPubkey)
                    {
                        // Error Code
                        logger.error("Error -  Check Owner Public Key");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_PUBKEY.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_PUBKEY.MSG}};
                        break;
                    }
                }
                else
                {
                    // Error Code
                    logger.error("Error -  Invalid Action Target Range");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_TOKEN.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_TOKEN.MSG}};
                    break;
                }

                //
                let tcCreateSc = await contractProc.cCreateSc(Number(request.scAction), Number(request.actionTarget), request.sc, request.ownerPubkey, request.ownerPrikey, request.ownerPrikeyPw);

                if (tcCreateSc === false)
                {
                    logger.error("Create SC Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcCreateSc : " + JSON.stringify(tcCreateSc));
                // let contractJson = JSON.stringify(tcCreateSc);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcCreateSc.signed_pubkey, tcCreateSc);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcCreateSc;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.txScProc = async (reqQuery) => {
    const request = reqQuery;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : txScProc");

    try {
        if (request.hasOwnProperty("scAction") && 
            // request.hasOwnProperty("sc") &&
            request.hasOwnProperty("userPrikey") &&
            request.hasOwnProperty("userPrikeyPw") && 
            request.hasOwnProperty("userPubkey") &&
            request.hasOwnProperty("toAccount") &&
            request.hasOwnProperty("fromAccount") &&
            request.hasOwnProperty("subId"))
        {
            logger.debug("scAction : " + request.scAction);
            // logger.debug("sc : " + request.sc);
            logger.debug("userPrikey : " + request.userPrikey);
            logger.debug("userPrikeyPw : " + request.userPrikeyPw);
            logger.debug("userPubkey : " + request.userPubkey);
            logger.debug("toAccount : " + request.toAccount);
            logger.debug("fromAccount : " + request.fromAccount);
            logger.debug("subId : " + request.subId);

            do
            {
                //
                let apiPath;
                let apiRes;
                let sc;
                //
                if (request.sc) {
                    if(!util.isJsonString(request.sc))
                    {
                        // Error Code
                        logger.debug("Error -  Invalid sc json value");
                        break;
                    }
                    sc = request.sc;
                }

                // Check SC Action
                //
                if ((Number(request.scAction) < define.CONTRACT_DEFINE.ACTIONS.CONTRACT.SC.STT) ||
                    (Number(request.scAction) > define.CONTRACT_DEFINE.ACTIONS.CONTRACT.NFT.END))
                {
                    // Error Code
                    logger.debug("Error -  Invalid SC Action Range");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_SC_ACTION_RANGE.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_SC_ACTION_RANGE.MSG}};
                    break;
                }

                // Check To Account
                let toAccount = request.toAccount;
                let toAccountInfo;
                if (isNaN(Number(toAccount))) {
                    if (toAccount.length == 66) {
                        toAccountInfo = await dbNNHandler.getUserAccountByPubkey(toAccount);
    
                        if (toAccountInfo !== false) {
                            toAccount = toAccountInfo.account_num;
                        } else {
                            ret_msg = { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                            break;
                        }
    
                    } else {
                        toAccountInfo = await dbNNHandler.getUserAccountByAccountId(toAccount);
    
                        if (toAccountInfo !== false) {
                            toAccount = toAccountInfo.account_num;
                        } else {
                            ret_msg = { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                            break;
                        }
                    }
                }
                apiPath = `/account/chk/info?accountNum=${toAccount}`;
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                if (apiRes.errorCode) {
                    // Error Code
                    logger.error("Error -  Check to Account");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                    break;
                }
                toAccountId = apiRes.contents.uAccountInfo.account_id;

                // Check SC Action
                apiPath = `/account/chk/info?scActionTarget=${request.scAction}`;
                logger.debug("apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("apiRes : " + JSON.stringify(apiRes));
                logger.debug("apiRes.errorCode : " + apiRes.errorCode);
                if (apiRes.errorCode) // NOT Existed
                {
                    // Error Code
                    logger.debug("Error -  Check SC Action");
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_SC_ACTION.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_SC_ACTION.MSG}};
                    break;
                }

                // Check recent owner of sub_id
                let chkRecentTx = await dbNNHandler.accountScActionAndSubId(request.scAction, request.subId);
                logger.debug("chkRecentTx : " + JSON.stringify(chkRecentTx));
                if(chkRecentTx.length && Number(request.fromAccount)) 
                {
                    logger.debug("NFT TX - USER to USER");
                    apiPath = `/account/chk/info?accountNum=${request.fromAccount}`;
                    apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);

                    if (apiRes.errorCode) {
                        // Error Code
                        logger.error("Error -  Check from Account");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                        break;
                    }

                    if (chkRecentTx[0].to_account_num != apiRes.contents.uAccountInfo.account_num) {
                        logger.error(`${request.fromAccount} is NOT current owner of ${request.subId}`);
                        // Error Code
                        logger.error("Error -  Check SC Action");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_SC_ACTION.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_SC_ACTION.MSG}};
                        break;
                    }

                    apiPath = `/account/chk/info?accountNum=${chkRecentTx[0].to_account_num}`;
                    apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                    if (apiRes.errorCode) {
                        // Error Code
                        logger.error("Error -  Check to Account");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                        break;
                    }

                    if (apiRes.contents.uAccountInfo.owner_pk != request.userPubkey) {
                        logger.error("Error -  Check from Account - Invalid Public Key");
                        ret_msg =  { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                        break;
                    }

                    if (chkRecentTx[0].sc) {
                        sc = JSON.parse(chkRecentTx[0].sc);
                        sc.owner = toAccountId;
                        sc = JSON.stringify(sc);
                    }
                } else {
                    logger.debug("NFT TX - MINTING");
                }

                //
                let fromAccountHexStr = BigInt(request.fromAccount).toString(16);
                // let toAccountHexStr = BigInt(request.toAccount).toString(16);
                let toAccountHexStr = BigInt(toAccount).toString(16);
                //
                
                // let tcTxSc = await contractProc.cTxSc(Number(request.scAction), request.sc, request.userPubkey, request.userPrikey, fromAccountHexStr, toAccountHexStr, request.userPrikeyPw);
                let tcTxSc = await contractProc.cTxSc(Number(request.scAction), sc, request.userPubkey, request.userPrikey, fromAccountHexStr, toAccountHexStr, request.userPrikeyPw);
                logger.debug("module.exports.txScProc= ~ tcTxSc" + tcTxSc)
                logger.debug("module.exports.txScProc= ~ tcTxSc" + JSON.stringify(tcTxSc))

                if (tcTxSc === false)
                {
                    logger.error("Tx Sc Is Invalid");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_CONTRACT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_CONTRACT.MSG}};
                    break;
                }

                logger.debug("tcTxSc : " + JSON.stringify(tcTxSc));
                // let contractJson = JSON.stringify(tcTxSc);

                // Verifying Signature
                let verifyResult = cryptoUtil.verifySign(tcTxSc.signed_pubkey, tcTxSc);
                logger.debug("verifyResult : " + verifyResult);

                if (verifyResult === false)
                {
                    logger.error("Signature Is Invalid(Verify failed)");
                    ret_msg = { errorCode : define.ERR_MSG.ERR_VERIFY_SIG.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_VERIFY_SIG.MSG}};
                    break;
                }

                //
                let msg = tcTxSc;

                //////////////////////////////////////////////////////////////////
                // KAFKA
                // Get Kafka Info
                apiPath = `/kafka/broker/list?all`;
                logger.debug("KAFKA apiPath : " + apiPath);
                apiRes = await webApi.APICallProc(apiPath, config.FBNIN_CONFIG, webApi.WEBAPI_DEFINE.METHOD.GET);
                logger.debug("KAFKA apiRes : " + JSON.stringify(apiRes));

                if (apiRes.errorCode)
                {
                    // Error Code
                    ret_msg =  { errorCode : define.ERR_MSG.ERR_KAFKA_LIST.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_LIST.MSG}};
                    break;
                }

                let brokerList = apiRes.contents.kafka_list[0].broker_list;
                let topicList = apiRes.contents.kafka_list[0].topic_list;
                let subNetId = util.hexStrToInt(apiRes.contents.kafka_list[0].topic_list.slice(8,12));

                logger.error("brokerList : " + brokerList);
                logger.error("topicList : " + topicList);

                // Set Kafka Info
                kafkaHandler.setMyKafkaInfo(brokerList, topicList);

                //
                kafkaHandler.setMySubNetId(subNetId);

                // Send To Kafka
                let sentMsg = await kafkaHandler.sendContractMsg(msg);
                if (sentMsg === true)
                {
                    ret_msg = { errorCode : define.ERR_MSG.SUCCESS.CODE, contents : { res : true, msg : define.ERR_MSG.SUCCESS.MSG}};
                }
                else
                {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_KAFKA_TX.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_KAFKA_TX.MSG}};
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}

//
module.exports.mintScProc = async (reqBody) => {
    const request = reqBody;
    let ret_msg = { errorCode : define.ERR_MSG.ERR_NO_DATA.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_NO_DATA.MSG}};

    logger.debug("func : mintScProc");

    try {
        if (request.hasOwnProperty("amount") && 
            request.hasOwnProperty("toAccount") &&
            request.hasOwnProperty("pNum"))
        {
            logger.error("amount : " + request.amount);
            logger.error("toAccount : " + request.toAccount);

            do
            {
                //
                let apiPath;
                let apiRes;
                let recentPer;
                let toAccount;
                let scAction;

                // Check toAccount
                let userInfo = await dbNNHandler.getUserAccountByAccountId(request.toAccount);
                if (userInfo !== false) {
                    toAccount = userInfo.account_num;
                    logger.error("toAccount acc_num: " + toAccount);
                } else {
                    ret_msg = { errorCode : define.ERR_MSG.ERR_ACCOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_ACCOUNT.MSG}};
                    break;
                }

                // Check LEFT amount of NODE
                let nodeList = define.NODE_LIST;
                // 1. specific scAction - mapping with node name 
                // if (request.hasOwnProperty("scAction")) {
                if (request.hasOwnProperty("nodeName")) {

                    let nodeName = (request.nodeName).toUpperCase();
                    
                    let node_sc = nodeList[`${nodeName}`].sc_action;
                    
                    // recentPer = await dbNNHandler.getSumofRatioScAction(request.scAction);
                    recentPer = await dbNNHandler.getSumofAmountScAction(node_sc);
                    scAction = recentPer.sc_action;
                    if (recentPer.sum_amount < nodeList.TOTAL_PRICE) {
                        if (nodeList.TOTAL_PRICE < Number(request.amount) + recentPer.sum_amount) {
                            //ERROR CODE
                            ret_msg = { errorCode : define.ERR_MSG.ERR_AMOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_AMOUNT.MSG}};
                            break;
                        }
                    } else {
                        //ERROR CODE
                        logger.error("unavailable to buy: " + request.scAction);
                        ret_msg = { errorCode : define.ERR_MSG.ERR_SOLD_OUT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_SOLD_OUT.MSG}};
                        break;
                    }
                } else {
                    // 2. any scAction
                    recentPer = await dbNNHandler.getSumofAmount();
                    for (let i = 0; i < recentPer.length; i++){
                        if (recentPer[i].sum_amount < nodeList.TOTAL_PRICE) {
                            if (nodeList.TOTAL_PRICE >= Number(request.amount) + recentPer[i].sum_amount) {
                                scAction = recentPer[i].sc_action;
                            }
                        } else {
                            //ERROR CODE
                            ret_msg = { errorCode : define.ERR_MSG.ERR_AMOUNT.CODE, contents : { res : false, msg : define.ERR_MSG.ERR_AMOUNT.MSG}};
                            break;
                        }
                    }
                }

                logger.debug("scAction: " + scAction);
                logger.debug("toAccount: " + toAccount);
                

                if (scAction && toAccount) {
                    let subId = await dbNNHandler.getMintSubId(scAction);
                    logger.debug("subId: " + subId);

                    let ratioCal = request.amount / define.NODE_LIST.TOTAL_PRICE * 100;
                    
                    if (subId) {
                        let sc = {
                            sub_id: subId,
                            owner: request.toAccount,
                            meta_data: {
                                ratio: ratioCal,
                                amount: request.amount,
                                pNum: request.pNum
                            }
                        }

                        if (request.hasOwnProperty("seller")) {
                            sc.meta_data.seller = request.seller;
                        }

                        if (request.hasOwnProperty("pSiteId")) {
                            sc.meta_data.pSiteId = request.pSiteId;
                        }

                        let apiRoutePath = '/contract/sc/tx';
                        let dir = nodeList.KEY_DIR;
                        // let tkeyStoreJson = fs.readFile(dir, "binary", (err, data) => {
                        //     if(err) {
                        //         console.log(err);
                        //     }
                        //     console.log(data);
                        // });

                        let tkeyStoreJson = await fs.readFileSync(dir, 'binary');
                        let tkeyStore = JSON.parse(tkeyStoreJson);
                        let tokenPrikey = 'userPrikey';
                        let tokenPrikeyVal = tkeyStore.edPrikeyFin;
                        let tokenPrikeyPw = 'userPrikeyPw';
                        let tokenPrikeyPwVal = process.env.UTIL_TKN_PW;
                        let tokenPubkey = 'userPubkey';
                        let tokenPubkeyVal = define.CONTRACT_DEFINE.ED_PUB_IDX + await cryptoUtil.getPubkeyNoFile(tkeyStore.edPubkeyPem);
                        let tokenPrikeyEnc = encodeURIComponent(tokenPrikeyVal);
                        let tokenPrikeyPwEnc = encodeURIComponent(tokenPrikeyPwVal);
                        let tokenPubkeyEnc = encodeURIComponent(tokenPubkeyVal);
                        let scActionKey = 'scAction', scKey = 'sc', fAccountKey = 'fromAccount', tAccountKey = 'toAccount', subIdKey = 'subId';

                        let postData = `${scActionKey}=${scAction}&${scKey}=${JSON.stringify(sc)}&${tokenPrikey}=${tokenPrikeyEnc}&${tokenPrikeyPw}=${tokenPrikeyPwEnc}&${tokenPubkey}=${tokenPubkeyEnc}&${fAccountKey}=0&${tAccountKey}=${toAccount}&${subIdKey}=${subId}`;
                        logger.debug("postData: " + postData);
                        
                        apiRes = await webApi.APICallProc(apiRoutePath, config.NFT_CONFIG, webApi.WEBAPI_DEFINE.METHOD.POST, postData);
                        
                        logger.debug("apiRes: " + JSON.stringify(apiRes));
                        ret_msg = apiRes;
                    }
                } else {
                    break;
                }
            } while(0);
        }
    } catch (err) {
        logger.error("Error - ");
        logger.debug("ret_msg_p : " + JSON.stringify(ret_msg));
    }

    return (ret_msg);
}
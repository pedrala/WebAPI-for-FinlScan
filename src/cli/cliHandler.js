//
const define = require('./../../config/define.js');
const chkNodeNft = require('./../tx/chkNodeNft.js');
const logger = require('./../utils/winlog.js');

//
module.exports.handler = async (cmd) => {
    let retVal = true;

    logger.debug('webApi CLI Received Data : ' + cmd);

    let cmdSplit = cmd.split(' ');

    //
    if(cmd.slice(0,13) === define.CMD.TEST_NODE_NFT)
    {
        // //
        // let nodeNftInfo;
        // let data;

        // //
        // nodeNftInfo = {
        //     timestamp : Date.now() + 2000, 
        //     wName : "USER_01", 
        //     pSiteId : "WCL_USER_1"
        // };

        // // data = {jsonData : JSON.stringify(nodeNftInfo)};
        // chkNodeNft.pushNodeNftInfoArr(nodeNftInfo);

        // //
        // nodeNftInfo = {
        //     timestamp : Date.now(), 
        //     wName : "USER_02", 
        //     pSiteId : "WCL_USER_2"
        // };

        // // data = {jsonData : JSON.stringify(nodeNftInfo)};
        // chkNodeNft.pushNodeNftInfoArr(nodeNftInfo);

        // //
        // nodeNftInfo = {
        //     timestamp : Date.now() - 3000, 
        //     wName : "USER_03", 
        //     pSiteId : "WCL_USER_3"
        // };

        // // data = {jsonData : JSON.stringify(nodeNftInfo)};
        // chkNodeNft.pushNodeNftInfoArr(nodeNftInfo);

        // // await chkNodeNft.sendFinlToSch();
    }
    else
    {
        retVal = false;
        logger.error("[CLI] " + cmd + ' is an incorrect command. See is --help');
    }

    return retVal;
}
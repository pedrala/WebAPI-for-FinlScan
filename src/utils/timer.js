//
const config = require('./../../config/config.js');
const define = require('./../../config/define.js');

// const chkNodeNft = require("./../tx/chkNodeNft.js")
const myCluster = require("./../myCluster.js");

//////////////////////////////////////////////////
//
let timerObjApiToNodeNft = 0;
let timerObjApiToNodeNftMsInterval = 50;

//
module.exports.setIntervalApiToNodeNft = () => {
    if (timerObjApiToNodeNft)
    {
        return false;
    }

    timerObjApiToNodeNft = setInterval(myCluster.sendNodeNftInfoArrToMaster, timerObjApiToNodeNftMsInterval);

    return true;
}

module.exports.clrIntervalApiToNodeNft = () => {
    if (!timerObjApiToNodeNft)
    {
        return false;
    }

    clearInterval(timerObjApiToNodeNft);

    timerObjApiToNodeNft = 0;

    return true;
}
//////////////////////////////////////////////////

//////////////////////////////////////////////////
//
let timerObjTChkNodeNft = 0;
let timerObjChkNodeNftMsInterval =  define.FIXED_VAL.FIVE_SEC_MS;

//
module.exports.setIntervalChkNodeNft = () => {
    if (timerObjTChkNodeNft)
    {
        return false;
    }

    timerObjTChkNodeNft = setInterval(myCluster.sendNullNftInfoTxsToMaster, timerObjChkNodeNftMsInterval);

    return true;
}

module.exports.clrIntervalChkNodeNft = () => {
    if (!timerObjTChkNodeNft)
    {
        return false;
    }

    clearInterval(timerObjTChkNodeNft);

    timerObjTChkNodeNft = 0;

    return true;
}
//////////////////////////////////////////////////

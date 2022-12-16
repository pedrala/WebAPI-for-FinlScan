
//
const config = require('./../../config/config.js');
const define = require('./../../config/define.js');
const util = require('./../utils/commonUtil.js');

const applog = require('./../utils/applog.js');

//
let nodeNftInfoArr = new Array();
module.exports.nodeNftInfoArr = nodeNftInfoArr;

module.exports.getNodeNftInfoArr = () => {
    let tempArray = [...nodeNftInfoArr];
    return tempArray;
}

module.exports.getNodeNftInfoArrLen = () => {
    return nodeNftInfoArr.length;
}

module.exports.setNodeNftInfoArr = async (array) => {
    nodeNftInfoArr = nodeNftInfoArr.concat(array);
}

module.exports.pushNodeNftInfoArr = (data) => {
    // logger.debug("data.jsonData : " + data.jsonData);
    nodeNftInfoArr.push(data);
}

module.exports.reinitNodeNftArray = async () => {
    nodeNftInfoArr = new Array();
}

//
// Sort in Ascending order (low to high)
module.exports.nodeNftInfoArrSortedAsc = async () => {
    nodeNftInfoArr.sort(function(x, y){
        // x1 = JSON.parse(x.jsonData);
        // y1 = JSON.parse(y.jsonData);

        // logger.debug("y.timestamp : " + y1.timestamp + ", x.timestamp : " +  x1.timestamp);

        // return x1.timestamp - y1.timestamp; // Asc Sort

        return x.timestamp - y.timestamp; // Asc Sort
    });
}

// Sort in Descending order (high to low)
module.exports.nodeNftInfoArrSortedDesc = async() => {
    nodeNftInfoArr.sort(function(x, y){
        // x1 = JSON.parse(x.jsonData);
        // y1 = JSON.parse(y.jsonData);

        // logger.debug("y.timestamp : " + y1.timestamp + ", x.timestamp : " +  x1.timestamp);

        // return y1.timestamp - x1.timestamp; // Desc Sort

        return y.timestamp - x.timestamp; // Desc Sort
    });
}

//
module.exports.sendFinlToSch = async () => {
    //
}

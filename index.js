'use strict';

const { Client } = require('@elastic/elasticsearch');
const ElasticsearchClient = new Client({ node: process.env.ELASTICSEARCH_ENDPOINT });

exports.handler = (event, context, callback) => {
    Main(event, context)
        .then((msg) => {              
            callback(null, msg);
        })
        .catch((err) => {   
            console.log(err);``
            callback(null, err);
        });
};

async function Main(event, context) {

    let indexes = await ElasticsearchClient.cat.indices({
        index: [event.index_pattern],
        format: "json",
        h: ["i","creation.date","id"],
    });
    
        
    let expiredIndexes = getExpiredIndexes(indexes, event.retention);
    for (let index = 0; index < expiredIndexes.length; index++) {
        try {
            let res = await ElasticsearchClient.indices.delete({
                index: expiredIndexes[index],
            });
            if(res.statusCode === 200) {
                console.log('Index has been deleted: '+ expiredIndexes[index]);
            } else {
                console.log('Failed to delete the index: '+ expiredIndexes[index]);
                console.log(res);
            }
        } catch(exception) {
            console.log(exception);
        }
    }
    return Promise.resolve("Done");
}

let getExpiredIndexes = (indexes, retention) => {
    
    let expiredIndexes = [];
    let currentTime = new Date().getTime();
    for (let index = 0; index < indexes.body.length; index++) {
        console.log(parseInt((currentTime - parseInt(indexes.body[index]['creation.date']))/1000/60/60));
        if( parseInt((currentTime - parseInt(indexes.body[index]['creation.date']))/1000/60/60) > retention*24) {
            expiredIndexes.push(indexes.body[index]['i']);
        }
    }
    return expiredIndexes;
};
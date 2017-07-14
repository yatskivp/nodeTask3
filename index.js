// GET{/scores} - return arr obj scores
// GET{/scores}?top=scoreTime or scoreEat - return sorted array by choosen field
// GET{/scores}?top=scoreTime or scoreEat&count=int or number  - return amount of int or number values
// GET{/scores}?top=scoreTime or scoreEatOr&minValue=true - return user object with min value of scoreTime or scoreEat
// POST{/scores} body{"user" (required parameter)- UserName; Not required parameter: "scoreTime", "scoreEat"}
// GET {/scores/[user]} - return score obj for [user]
// PUT {/scores/[user]} body {"scoreTime" and/or "scoreEat"} 
// DELETE {/scores/[user]} - remove [user] score obj
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const Joi = require('joi');
const app = express();

let errorCall = (err,req,res,next)=>{
    if(!isNaN(err.name)){
        res.status(err.name).json({ error: err.message});
    }else{
        next(err);
    }
}

let getUser = (reqUser) => {
    let userObj = {}, index;
    let resultArr = JSON.parse(fs.readFileSync('scores.json','utf-8'));
    resultArr.forEach((item,i) => {
        if(item[reqUser]){
           userObj = item;
           index = i;
        }
    })
    if(userObj[reqUser]){
        return {'resultArr':resultArr,'userObj':userObj,'index':index}
    }
    return false
}
let count = {number:0,int:0};
function sort(arr,val){
	var arrVal = [], tmpObj = {}, tmpArr = [];
	arr.forEach(function(item){
		for(var key in item){
            		arrVal.push([key,item[key]]);
            		if(item[key][val]%1){
                		count.number+=1
            		}else{
                		count.number+=1;
                		count.int+=1
            		}
		}
	})	
	arrVal.sort((a,b) => b[1][val]-a[1][val]);
	arrVal.forEach((item) => {
        	tmpObj[item[0]] = item[1];
        	tmpArr.push(tmpObj);
        	tmpObj = {};
    	})
	return tmpArr
}

const schema = Joi.object().keys({
    user: Joi.string().alphanum().min(3).max(30),
    scoreTime: Joi.number().min(0).max(86400),
    scoreEat: Joi.number().integer().min(0).max(10000)
}).with('user','scoreTime','scoreEat');

app.use(bodyParser());

app.route('/scores')
    .get((req,res,next) => {
        count = {number:0,int:0};
        fs.readFile('scores.json','utf-8',(err,data) =>{
            if(err){
                next(err);
                return
            }
            if(req.query.top == 'scoreTime' || req.query.top == 'scoreEat'){
                if(req.query.count == 'int' || req.query.count == 'number'){
                    sort(JSON.parse(data),req.query.top);                    
                    res.status(200).json({count:count[req.query.count]});         
                }else if(req.query.minValue){
                     res.status(200).json({minValue:sort(JSON.parse(data),req.query.top).reverse()[0]});
                }else{
                    res.status(200).json(sort(JSON.parse(data),req.query.top));
                }
            }else{
                res.status(200).json(JSON.parse(data));
            }
        })
    })
    .post((req,res,next) => {
        let valid = Joi.validate(req.body,schema);
        if(!valid.error){
            let scoreArr = JSON.parse(fs.readFileSync('scores.json','utf-8'));
            let useObj={};     
            for(let i=0; i<scoreArr.length; i++){
                if(scoreArr[i][req.body.user]){//заюзав фор, щоб здійснити ретурн із цього роута 
                    let err = new Error(`User's name ${req.body.user} is already exist`);
                    err.name = '400'; 
                    next (err);
                    return    
                }
            }
            if(req.body.user){
                let scoreTime = req.body.scoreTime || 0,
                    scoreEat = req.body.scoreEat || 0;
                useObj[req.body.user] = {scoreTime:scoreTime,scoreEat:scoreEat};
                scoreArr.push(useObj);
                fs.writeFile('scores.json', JSON.stringify(scoreArr), (err) => {
                    if (err){
                        next(err);
                        return
                    }
                });
                res.status(200).json({operation : 'User added'});
            }else{
            	let err = new Error(`User or/and some user's parameter(s) is invalide`);
            	err.name = '400'; 
            	next (err);
           }         
        next();
    }else{
        let err = new Error(valid.error);
        err.name = '400'; 
        next (err);
    }
})
     
app.route('/scores/:user')
    .get((req,res,next) => {
        let resobj = getUser(req.params.user);
        if(resobj.userObj){
            res.json(resobj.userObj);
        }else{    
            let err = new Error(`User ${req.params.user} not exists`);
            err.name = '404'; 
            next(err);
        }
    })
    .put((req,res,next) => {
        let valid = Joi.validate(req.body,schema);
        if(!valid.error){
            let resObj = getUser(req.params.user);
            if(resObj.userObj){
                if(req.body.scoreTime || req.body.scoreEat){
                    let scoreTime = req.body.scoreTime || resObj.userObj[req.params.user].scoreTime;
                    let scoreEat = req.body.scoreEat || resObj.userObj[req.params.user].scoreEat;
                    resObj.resultArr[resObj.index][req.params.user] = {scoreTime:scoreTime,scoreEat:scoreEat};
                    fs.writeFile('scores.json', JSON.stringify(resObj.resultArr), (err) => {
                        if (err) {
                            next(err);
                            return
                        };
                    });
                    res.status(200).json({operation:'ScoreTime or(and) ScoreEat were updated successful!'});
                }else{
                    let err = new Error(`You try to change invalide parameter(s)`);
                    err.name = '400'; 
                    next(err);
                }
            }else{
                let err = new Error(`${req.params.user} not exists !`);
                err.name = '404'; 
                next(err);
            }
        }else{
            let err = new Error(valid.error);
            err.name = '400'; 
            next (err);
        }
    })
    .delete((req,res,next) => {
         let resObj = getUser(req.params.user);
         if(resObj){
            resObj.resultArr.splice(resObj.index,1);
            fs.writeFile('scores.json', JSON.stringify(resObj.resultArr), (err) => {
                if (err){
                    next(err);
                    return
                };
            });
            res.status(200).json({operation:`User ${req.params.user} was deleted successful`});
         }else{
            let err = new Error(`${req.params.user} not exists !`);
            err.name = '404'; 
            next(err);
         }
    })

app.use(errorCall);
app.use((err, req, res, next) => {
  res.status(500)
  res.json({error:err})
});

app.listen(8000, () =>{
    console.log('Startted on 8000 port');
})

/**
 * Created by bexuser on 5/2/15.
 */
var config = require(__dirname+'/config/config.json');
var Client = require('node-rest-client').Client;
var client = new Client();
//console.log("A "+JSON.stringify(config));
var q = require('q');
var quippe = require('@medicomp/quippe');
quippe.registerService(['Quippe.IAuthorizationService'],{
        AuthCheck : function(data){
            /*
             var promise = q.defer();
             promise.resolve(true);
             return promise.promise;
             */

            var promise = q.defer();
            client.get(config.rest_host+"/oauthcookie/get?cookieID="+data.Cookies[".QuippeDemoSiteAuth"],
                function(data,response){
                    try{
                        data=JSON.parse(data);
                        if(data.error==null){
                            promise.resolve(true);
                        }else{
                            promise.resolve(false);
                        }
                    }catch(err)
                    {
                        promise.resolve(null);
                    }
                }
            );
            return promise.promise;
        }
        ,
        IsAdmin : function(data){
            var promise = q.defer();
            client.get(config.rest_host+"/oauthcookie/get?cookieID="+data.Cookies[".QuippeDemoSiteAuth"],
                function(data,response){
                    try{
                        data=JSON.parse(data);
                        if(data.error==null){
                            var adminFlag=false;
                            for(var i=0;i<data[0].setting.Roles.length;i++)
                                if(data[0].setting.Roles[i]=="Admin"){
                                    adminFlag=true;
                                }
                            promise.resolve(adminFlag);
                        }else{
                            promise.error(data.error);
                        }
                    }catch(err)
                    {
                        promise.resolve(null);
                    }

                }
            );
            return promise.promise;
        }
        ,
        GetContextData : function(data) {
            var promise = q.defer();
            //data.Cookies
            //data.Headers
            /*
             var promise = q.defer();
             promise.resolve({"Username":"admin","Roles":"Admin,Quippe,QuippeLibraryManager"});

             return promise.promise;
             */
            client.get(config.rest_host+"/oauthcookie/get?cookieID="+data.Cookies[".QuippeDemoSiteAuth"],
                function(data,response){
                    try{
                        //console.log('==== GetContextData ====');
                        //console.log(config.rest_host+"/oauthcookie/get?cookieID="+data.Cookies[".QuippeDemoSiteAuth"]);
                        data=JSON.parse(data);
                        //console.log('==== Result ====');
                        //console.loh(data);
                        if(data.error==null){
                            var roleStr="Admin,"+data[0].permission.bcds.setting.Roles[0];
                            for(var i=1;i<data[0].permission.bcds.setting.Roles.length;i++){
                                roleStr+=","+data[0].permission.bcds.setting.Roles[i];
                            }
                            promise.resolve({"Username":data[0].user,
                                "Roles":roleStr});
                        }else{
                            promise.resolve(null);
                        }
                    }catch(err)
                    {
                        promise.resolve(null);
                    }


                }
            );


            return promise.promise;
        }
    }
    ,{    usesPromises: true}
);

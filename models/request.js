const Joi = require("joi");
const _   = require("lodash");

function validateRequest(request) {
    try{
            const schemaSingleApprovalObj = Joi.object({
                docid: Joi.string().required(),
                appno: Joi.string().allow(null).allow(''), // MM mail onay süreci için null izin verildi char değer gelebilir
                uname: Joi.string().max(12).required(),
                prcid: Joi.string().required(),
                sysid: Joi.string().required(),
                aptkn: Joi.string().allow(null).allow(''),
                rjtkn: Joi.string().allow(null).allow(''),
                rvtkn: Joi.string().allow(null).allow(''),
                syscd: Joi.string().allow(null).allow(''),
                appno2: Joi.string().allow(null).allow(''),
            });
           
    
            return  schemaSingleApprovalObj.validate(request);
       
    }catch(oEx){
        throw new Error("Unknown error:" + oEx ); 
    }
}

exports.validateRequest = validateRequest;
/**
 * sms.send(手机号) 发送短信验证码
 * sms.verify(手机号,验证码) 校验验证码是否正确
 **/

const Core = require('@alicloud/pop-core');
const _ = require('lodash');

// 阿里云控制台 - 短信服务 - 国内消息
const SignName = "医佰康";
const TemplateCode = "SMS_153945017";

// https://usercenter.console.aliyun.com/
const accessKeyId = "xxxxxx";
const accessKeySecret = "xxxxxxx";

var client = new Core({
    accessKeyId,
    accessKeySecret,
    endpoint: 'https://dysmsapi.aliyuncs.com',
    apiVersion: '2017-05-25'
});

// 保存手机号和验证码的对应关系
// phone_code_list = {'18855551234':['1024']}
var phone_code_list = {};

exports.send = function(phone) {
    function randomCode(length) {
        var chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        var result = ""; //统一改名: alt + shift + R
        for (var i = 0; i < length; i++) {
            var index = Math.ceil(Math.random() * 9);
            result += chars[index];
        }
        return result;
    }
    // 生成验证码
    // var code = "" + _.random(9) + _.random(9) + _.random(9) + _.random(9);
    var code = randomCode(6);
    console.log(code);

    return new Promise((resolve, reject) => {
        try {
            client.request('SendSms', {
                RegionId: "cn-hangzhou",
                PhoneNumbers: phone,
                SignName,
                TemplateCode,
                TemplateParam: "{code:" + code + "}"
            }, {
                method: 'POST'
            }).then((result) => {
                if (result.Message && result.Message == "OK" && result.Code && result.Code == "OK") { // 短信发送成功
                    // 保存验证码
                    if (phone_code_list[phone]) {
                        phone_code_list[phone].push(code);
                    } else {
                        phone_code_list[phone] = [code];

                    }
                    // 三分钟后删除验证码
                    setTimeout(() => {
                        _.pull(phone_code_list[phone], code);
                        if (phone_code_list[phone] && phone_code_list[phone].length == 0) {
                            delete phone_code_list[phone];
                        }
                    }, 3 * 60 * 1000)
                    resolve(result)
                } else {
                    reject(result)
                }
            }, (ex) => {
                reject(ex)
            })
        } catch (error) {
            reject(error)
        }
    })
}

exports.verify = function(phone, code) {
    if (phone_code_list[phone] != undefined) {
        return (phone_code_list[phone].indexOf(code) > -1)
    } else {
        return false
    }

}
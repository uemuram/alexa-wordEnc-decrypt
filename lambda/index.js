// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const CommonUtil = require('/opt/CommonUtil');
const u = new CommonUtil();
const Constant = require('/opt/Constant');
const c = new Constant();

// ステータス
const ACCEPT_WORD = 0;
const CONFIRM_USE_KEY = 1;
const ACCEPT_KEY = 2;

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        //        const speakOutput = 'ようこそ。このスキルでは、姉妹スキル「暗号くん」で暗号化されたメッセージを解読します。';
        const speakOutput = 'ようこそ。解読します。鍵は設定されていますか?';
        const repromptOutput = '鍵は設定されていますか?';

        u.setState(handlerInput, CONFIRM_USE_KEY);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
    }
};

// 暗号化用の鍵を要求する
const RequestKeyIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.YesIntent'
            && u.checkState(handlerInput, CONFIRM_USE_KEY);
    },
    handle(handlerInput) {
        const speakOutput = '鍵に使う4桁の数字を言ってください';

        u.setState(handlerInput, ACCEPT_KEY);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// 暗号化用の鍵を受け付け、単語の受付を開始する
const AcceptKeyAndStartAcceptWordIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AcceptKeyIntent'
            && u.checkState(handlerInput, ACCEPT_KEY);
    },
    handle(handlerInput) {
        const speakOutput = '鍵xxで解読します。1つ目の単語をどうぞ';

        u.setState(handlerInput, ACCEPT_WORD);
        u.setSessionValue(handlerInput, 'WORD_NUM', 1);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// 暗号化用の鍵なしで、単語の受付を開始する
const StartAcceptWordIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NoIntent'
            && u.checkState(handlerInput, CONFIRM_USE_KEY);
    },
    handle(handlerInput) {
        const speakOutput = '鍵なしで解読します。1つ目の単語をどうぞ';

        u.setState(handlerInput, ACCEPT_WORD);
        u.setSessionValue(handlerInput, 'WORD_NUM', 1);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// 単語を受け付ける
const AcceptWordIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AcceptWordIntent'
            && u.checkState(handlerInput, ACCEPT_WORD);
    },
    handle(handlerInput) {

        // 単語を確認
        let wordSlot = handlerInput.requestEnvelope.request.intent.slots.Word.resolutions;
        let wordValue = handlerInput.requestEnvelope.request.intent.slots.Word.value;
        console.log("単語取得Value:" + wordValue);

        // 何番目の単語を取り扱っているかチェック
        const wordNum = u.getSessionValue(handlerInput, 'WORD_NUM');

        // ステータスチェック。失敗の場合は再受付
        let statusCode = wordSlot.resolutionsPerAuthority[0].status.code;
        console.log("単語取得ステータス:" + statusCode);
        if (statusCode !== 'ER_SUCCESS_MATCH') {
            console.log("単語取得失敗(" + wordNum + "番目)");
            return handlerInput.responseBuilder
                .speak('単語を認識できませんでした。もう一度お願いします。')
                // TODO 最終的には消す
                .withSimpleCard('失敗単語', wordValue)
                .reprompt(c.MSG_notGenerateScrambleYet)
                .getResponse();
        }

        // 単語取得成功した場合
        let wordId = parseInt(wordSlot.resolutionsPerAuthority[0].values[0].value.id);
        let wordName = wordSlot.resolutionsPerAuthority[0].values[0].value.name;
        console.log("単語取得成功(" + wordNum + "番目): " + wordName + "[" + wordId + "]");

        // 1つ目だった場合、単語の数と内部キーを算出
        if (wordNum == 1) {
            let keyInfo = u.getInnerKeyAndWordCount(wordId);
            let innerKey = keyInfo.innerKey;
            let wordCount = keyInfo.wordCount;
            console.log("内部キー:" + innerKey);
            console.log("単語数:" + wordCount);
        }

        //        const speakOutput = '単語を受け付けました';
        const speakOutput = wordName;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withSimpleCard('成功単語', wordName + '(' + wordValue + ')')
            .reprompt(speakOutput)
            .getResponse();
    }
};


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// リクエストインターセプター(エラー調査用)
const RequestLog = {
    process(handlerInput) {
        //console.log("REQUEST ENVELOPE = " + JSON.stringify(handlerInput.requestEnvelope));
        console.log("HANDLER INPUT = " + JSON.stringify(handlerInput));
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        console.log("REQUEST TYPE =  " + requestType);
        if (requestType === 'IntentRequest') {
            console.log("INTENT NAME =  " + Alexa.getIntentName(handlerInput.requestEnvelope));
        }
        return;
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        RequestKeyIntentHandler,
        AcceptKeyAndStartAcceptWordIntentHandler,
        StartAcceptWordIntentHandler,
        AcceptWordIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .addRequestInterceptors(RequestLog)
    .lambda();

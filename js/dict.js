/**词典 */

/**对中英文混合的句子决定使用那种翻译方式，中译英 or 英译中 */
function transType(text){
  // 对于过长的文本，性能如何？？
  let n_zh = text.replace(/[\u4E00-\u9FA5\uF900-\uFA2D]/g,'').length;
  let n_en = text.replace(/[^a-zA-Z]/g,'').length;
  let n = text.length;
  if(n_en / n >= 0.2){
    // 英译中
    return 'en'
  }else{
    // 中译英
    return 'zh'
  }
}


function youdaoClass() {
  /**YoudaoClass说明:
   * 查词前需要初始化，调用youdao.init()
   * 创建目录：wx.env.USER_DATA_PATH + 'temp'
   * 创建文件：temp/ss.mp3,temp/uss.mp3,temp/uks.mp3,temp/s.mp3
   */
  var youdao = this
  this.query_word = ''
  this.query_sentence = ''
  this.word_index = []
  this.query_result = { 'word': '', 'explain': [], 'usspeech': '', 'usphone': '', 'ukspeech': '', 'ukphone': '', 'speech': '', 'exam_type': [], 'tranInput': '', 'tran': '', /*'sspeech': '', 'sspeechPath': '', playingStyle: {}*/ }
  this.youdao_api_url = "https://dict.youdao.com/jsonapi"  //?q=
  this.youdao_audio_url = "https://dict.youdao.com/dictvoice?audio="
  this.youdao_trans_url = "https://fanyi.youdao.com/translate?doctype=json&i="  // 
  this.youdao_suggest_url = "https://dict.youdao.com/suggest?le=eng&doctype=json&q=";  // q=查询关键词 
  this.youdao_request_data = {}  // youdao Request 请求结果储存
  this.request_para = {
    "header": {
      // 'user-agent':'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    },
    "data": {}
  }
  this.audio = {
    audio: wx.createInnerAudioContext(),
    ss: '',
    uss: '',
    uks: wx.env.USER_DATA_PATH + '/temp/uks.mp3',
    s: ''
  }
  this.ssCanPlay = res={} // 句子朗读可播放回调
  this.dictMore = {}; // 保存详细查词结果

  this.init = function () {
    /**初始化，建立需要的目录，调用一次 */
    const fs = wx.getFileSystemManager()
    try {
      var temp = fs.accessSync(wx.env.USER_DATA_PATH + '/temp')
      if(temp != undefined){
        fs.mkdir({
          dirPath: wx.env.USER_DATA_PATH + '/temp',
          fail(e) {
            console.log('youdao init fail 1 ...')
          }
        })
      }
    } catch (e) {
      fs.mkdir({
        dirPath: wx.env.USER_DATA_PATH + '/temp',
        fail(e) {
          console.log('youdao init fail 2...')
        }
      })
    }
    
  }

  this.youdaoRequest = async function (url, next = this.youdaoParse) {
    /** 请求查词， */
    // console.log('youdaoRequest  =>', url)
    // URL编码
    url = encodeURI(url)
    var data = await new Promise((resolve,reject)=>{
      wx.request({
        url: url,
        data: youdao.request_para.data,
        header: youdao.request_para.header,
        success(res) {
          // 请求成功返回，
          console.log('youdaoRequest: result =>', res)
          resolve(res)
        }
      })
    })
    
    if(data.statusCode == 200){
      youdao.youdao_request_data = data.data
    }else{
      youdao.youdao_request_data = {'status':'error'}
    }

  }

  this.transRequest = async function (i,type="AUTO") {
    if(type=="en"){
      type = "EN2ZH_CN"
    }else if(type =="zh"){
      type ="ZH_CN2EN"
    }else{
      type = "AUTO"
    }
    /** 翻译句子，质量较差 */
    var trans_url = `${youdao.youdao_trans_url}${i}&type=${type}`
    // console.log('youdao_url', trans_url)

    // URL编码
    youdao_url = encodeURI(trans_url, next = res => { })
    let data = await new Promise((resolve,reject)=>{
      wx.request({
        url: trans_url,
        success(res) {
          // 请求成功返回，
          console.log('youdaoRequest: result =>', res)
          resolve(res)
          //console.log(res.data)
        },
        fail(e){
          reject(e)
        }
      })
    })
    if (data.statusCode == 200) {
      /** 请求成功 */
      youdao.youdao_request_data = data.data
    } else {
      youdao.youdao_request_data = {}
      wx.showToast({
        title: '请求失败，statusCode:' + res.statusCode,
        icon: 'none'
      })
    }
  }

  this.youdaoParse = function () {
    /** 解析有道词典的返回结果，request-success回调 */
    youdao.query_result['word'] = youdao.query_word
    // 释义
    if ('ec' in youdao.youdao_request_data) {
      var youdao_ec = youdao.youdao_request_data['ec']['word'][0]['trs']
      youdao.query_result['explain'] = []
      for (var i in youdao_ec) {
        // console.log(i)
        var explain = youdao_ec[i]['tr'][0]['l']["i"][0]
        youdao.query_result['explain'].push(explain)
      }
      // 音标&发音_显示
      var youdao_word = youdao.youdao_request_data['ec']['word'][0]
      if ('ukspeech' in youdao_word) {
        youdao.query_result['ukspeech'] = true // youdao.youdao_audio_url + youdao_word['ukspeech']
        youdao.query_result['ukphone'] = youdao_word['ukphone']
        let url = youdao.youdao_audio_url + youdao_word['ukspeech']
        let path = wx.env.USER_DATA_PATH + '/temp/uks.mp3'
        // youdao.downloadAudio(url, path)
        download(url,path)
        youdao.audio.uks = path
      } else {
        youdao.audio.uks = ''
      }
      if ('usspeech' in youdao_word) {
        youdao.query_result['usspeech'] = true  // youdao.youdao_audio_url + youdao_word['usspeech']
        youdao.query_result['usphone'] = youdao_word['usphone']
        let url = youdao.youdao_audio_url + youdao_word['usspeech']
        let path = wx.env.USER_DATA_PATH + '/temp/uss.mp3'
        // youdao.downloadAudio(url, path)
        download(url, path)
        youdao.audio.uss = path
      } else {
        youdao.audio.uss = ''
      }
      if ('speech' in youdao_word) {
        youdao.query_result['speech'] = true   // youdao.youdao_audio_url + youdao_word['speech']
        let url = youdao.youdao_audio_url + youdao_word['speech']
        let path = wx.env.USER_DATA_PATH + '/temp/s.mp3'
        // youdao.downloadAudio(url, path)
        download(url, path)
        youdao.audio.s = path
      } else {
        youdao.audio.s = ''
      }


      // 分类
      youdao.query_result['exam_type'] = youdao.youdao_request_data['ec']['exam_type']

      console.log(youdao.query_result)
    } else if (false) {
      /** 尝试解析其他词典内容 */

    } else {
      /** 未返回有效内容 */
      console.log('hiddenExplainBox')
      // wx.showToast({
      //   title: '未找到该词',
      //   icon: 'none'
      // })
    }

    // setData
    // youdao.setData()
  }

  /**查词 */
  this.queryWord = async function (q) {
    /** 有道查词，main */
    // console.log('queryWord =>', q)
    // 清理上次查询数据
    this.clear()
    this.query_word = q
    let url = `${youdao.youdao_api_url}?q=${q}`
    await this.youdaoRequest(url)
    this.youdaoParse()

    return youdao.query_result
  }

  this.clear = function () {
    youdao.query_result = {}
    youdao.audio.audio.destroy()
  }

  /**翻译句子 */
  this.translate = async function (s, ssCanPlay=res=>{}) {
    /** 翻译句子 */
    // console.log('youdaoTrans  =>',s)
    this.clear()
    /** 句子处理 */
    s = s.replace(/\n/, ' ')
    this.query_sentence = s
    this.ssCanPlay = ssCanPlay // 句子下载完成回调
    let url = `${youdao.youdao_api_url}?q=${s}`
    // await youdao.youdaoRequest(url)
    let type = transType(s)
    await youdao.transRequest(s,type)
    this.youdaoSentenceParse()

    return youdao.query_result
    // youdao.transRequest(s,youdao.youdaoSentenceParse)
  }

  this.youdaoSentenceParse = function () {
    /** 有道句子翻译解析 */
    youdao.query_result = {}
    youdao.query_result['tranInput'] = ''
    // console.log('----youdao Sentence Parse----')
    var request_data = youdao.youdao_request_data
    // console.log('request_data  =>', youdao.youdao_request_data)
    // 以下if为兼容写法，兼容，两个不同api的结果
    if ('fanyi' in youdao.youdao_request_data) {
      try {
        youdao.query_result['tranInput'] = youdao.youdao_request_data['fanyi']['input']
        youdao.query_result['tran'] = youdao.youdao_request_data['fanyi']['tran']
      } catch (e) {
        // e? 没有 fanyi
      }
    } else if ('translateResult' in youdao.youdao_request_data) {
      try {
        youdao.query_result['tranInput'] = youdao.youdao_request_data['translateResult'][0][0]['src']
        youdao.query_result['tran'] = youdao.youdao_request_data['translateResult'][0][0]['tgt']
      } catch (e) {
        // e? 没有 fanyi
      }
    }

    // console.log('query_result ->', youdao.query_result)

    youdao.query_result['sspeech'] = true // sspeech
    // console.log('sentenceParse query_result  =>', youdao.query_result)
    // youdao.setData()

    // 翻译音频， 仅英文, 有正文将中断
    let sInput = youdao.query_sentence
    // youdao auido api 不支持中文，需要删除sInput中的中文
    sInput = sInput.replace(/[^\w,;\.]/g, ' ')
    sInput = sInput.replace(/\s+/g, ' ')
    sInput = sInput.replace(/^\s/, '')
    let sspeech = `${youdao.youdao_audio_url}${sInput}`
    sspeech = encodeURI(sspeech)
    let path = wx.env.USER_DATA_PATH + '/temp/ss.mp3'
    youdao.audio.ss = path
    // callback可播放状态更新回调
    // youdao.downloadAudio(sspeech, path, youdao.ssCanPlay)
    download(sspeech, path, youdao.ssCanPlay)
  }

  this.playSSAudio =async function () {
    /** 播放读音,返回播放动画的style */
    youdao.audio.audio = wx.createInnerAudioContext()
    youdao.audio.audio.src = youdao.audio.ss
    // console.log('audio ss ->', youdao.audio.ss)
    youdao.audio.audio.play()


    // var audio = youdao.audio.audio
    // var audio = '121221122'
    // await new Promise((resolve,reject)=>{
    //   setTimeout(()=>{resolve()},1000)
    // }) 
    //let time = youdao.audio.audio.duration
    let time = youdao.audio.audio.duration
    console.log('time audio->',time)
    let playCount = time / 0.5
    console.log('动画次数 =>', playCount, time)
    if (playCount == 0) {
      playCount = 3
      time = 1500
    }
    let playing = `animation:audioPlaying 0.5s ${playCount};`
    return [playing,time]
  }

  /**查词建议 */
  this.suggest = async function(q){
    let url = `${this.youdao_suggest_url}${q}`
    // console.log('suggest q=',q)
    await this.youdaoRequest(url)
    this.suggestParse()

    return this.dictMore
  }

  this.suggestParse = function(){
    // this.dictMore = {
    //   suggest:[
    //     ['','']
    //   ]
    // }
    let data = this.youdao_request_data.data;
    if ('entries' in data){
      this.dictMore.suggest = []
      console.log('data ->',data)
      for(let i in data['entries']){
        this.dictMore.suggest.push([data['entries'][i].entry, data['entries'][i].explain])
      }
    }
  }


}

function download(url, path, callback = res => { }) {
  // console.log('开始下载 audio ->',path)
  try {
    wx.downloadFile({
      url: url,
      // hearder: {},
      filePath: path,
      success(e) {
        // console.log('audio download success ->', e)
        callback()
      },
      fail(e) {
        console.log('dictjs download fial ->', e)
      }
    })
  } catch (e) {
    console.log('dictjs download fial catch e ->', e)
  }
}


/**小程序云函数中转-限额，每月2w
 * 阿里云函数计算中转-限额，每月100w, 400000G*s
 * iciba词典注意事项：查询的单词【必须为小写】，不能有大写
 */
function icibaClass() {
  /** ，调用云函数，
   * request调用云函数
   */

  this.query_result; // this.resultObject() =  { 'word': '', 'explain': [], 'usspeech': '', 'usphone': '', 'ukspeech': '', 'ukphone': '', 'speech': '', 'exam_type': [], 'tranInput': '', 'tran': '', 'sspeech': '', 'sspeechPath': '', playingStyle: {} }

  this.query_word = '';
  this.resultData;
  this.ali_fc = "https://**************.cn-beijing.fc.aliyuncs.com/2016-08-15/proxy/wordReading/iciba/?key=zysj&q=";

  this.resultObject = function () {
    return { 'word': '', 'explain': [], 'usspeech': '', 'usphone': '', 'ukspeech': '', 'ukphone': '', 'speech': '', 'exam_type': [], 'tranInput': '', 'tran': '', 'sspeech': '', 'sspeechPath': '', playingStyle: {} }
  }
  this.audio = {
    audio: wx.createInnerAudioContext(),
    ss: '',
    uss: '',
    uks: wx.env.USER_DATA_PATH + '/temp/uks.mp3',
    s: ''
  }

  this.request =async function (w) {
    let iciba = this
    if (w == '') {
      w = this.query_word;
    } else {
      this.query_word = w;
    }
    let result = await new Promise((resolve,reject)=>{
      wx.cloud.callFunction({
        name: 'iciba',
        data: {
          word: w
        },
        complete(res) {
          console.log('iciba call function ->', res)
          let result = res.result
          result = JSON.parse(result)
          // iciba.resultData = result
          // callback()
          resolve(result)
        }
      })
    })
    iciba.resultData = result
  }

  /**同this.request,阿里云函数计算中转 */
  this.ali_request = async function(w){
    let iciba = this
    if (w == '') {
      w = this.query_word;
    } else {
      this.query_word = w;
    }
    let url = this.ali_fc + w // url编码？？
    url = encodeURI(url)
    let result = await new Promise((resolve)=>{
      wx.request({
        url: url,
        success(res) {
          // 请求成功返回，
          console.log('ali_fc iciba request =>', res)
          let result = res.data
          result = JSON.parse(result)
          resolve(result)
        }
      })
    })
    iciba.resultData = result
  }

  this.parseData = function () {
    var data = this.resultData
    console.log('==============data=============', data);
    this.query_result = this.resultObject();
    this.query_result['word'] = this.query_word;
    this.query_result['explain'] = []
    for (var i in data['symbols'][0]['parts']) {
      var explain = data['symbols'][0]['parts'][i]['part'] + data['symbols'][0]['parts'][i]['means']
      this.query_result['explain'].push(explain)
    }

    this.query_result['usphone'] = data['symbols'][0]['ph_am']
    if (data['symbols'][0]['ph_am_mp3'] != ''){
      this.query_result['usspeech'] = true
      this.audio.uss = data['symbols'][0]['ph_am_mp3']
    }
    this.query_result['ukphone'] = data['symbols'][0]['ph_en']
    if (data['symbols'][0]['ph_en_mp3'] != '') {
      this.query_result['ukspeech'] = true
      this.audio.uks = data['symbols'][0]['ph_en_mp3']
    }
    if (data['symbols'][0]['ph_tts_mp3'] != '') {
      this.query_result['speech'] = true
      this.audio.s = data['symbols'][0]['ph_tts_mp3']
    }
  }

  this.queryWord =async function (w) {
    // await this.request(w)
    w = w.toLowerCase()
    await this.ali_request(w)
    this.parseData()

    return this.query_result
  }

}


function aliTTSClass() {
  this.appkey = "XaGv5lEkat890WZm";
  this.token = "babaa8e31***********************";
  this.token = "ea865ce40***********************";
  this.text = "I looked at Miss Baker, 4.4 wondering what it was she";
  this.text = encodeURI(this.text)

  this.url = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?appkey=${this.appkey}&token=${this.token}&text=${this.text}&format=mp3&sample_rate=8000`

  this.test = function (text = '') {
    if (text != '') {
      this.text = encodeURI(text);
      this.url = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?appkey=${this.appkey}&token=${this.token}&text=${this.text}&format=mp3&sample_rate=8000`
    }

    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = this.url;
    innerAudioContext.play();
    innerAudioContext.onError(res => {
      console.log('audio play error ->', res)
    })

    // console.log('==========================================')
    // const backgroundAudio = wx.getBackgroundAudioManager()
    // backgroundAudio.title = "test";
    // backgroundAudio.scr = this.url;
    // backgroundAudio.onWaiting(res=>{
    //   console.log('on waiting...')
    // })


  }

}

/**微信同声传译插件，配额：文本翻译：每天10w次, 语音合成每天2w次
 * 可用于滑动翻译，语音合成
*/
function wechatSIClass(){
 this.wechatSI = requirePlugin("WechatSI")
  // let manager = plugin.getRecordRecognitionManager()
  this.query_result = { /*'word': '', 'explain': [], 'usspeech': '', 'usphone': '', 'ukspeech': '', 'ukphone': '', 'speech': '', 'exam_type': [],*/ 'tranInput': '', 'tran': '', 'sspeech': '', 'sspeechPath': ''}
  this.request_data = {},
  this.ssCanPlay = res=>{},     // 句子音频可播放回调
  this.ssAudioPath = '',

  this.request = async function(text){
    let textType = transType(text)
    let fromto;
    if (textType== 'en'){
      fromto = ["en_US","zh_CN"]
    } else if (textType == "zh"){
      fromto = ["zh_CN","en_US"]
    }
    let res = await new Promise((resolve,reject)=>{
      this.wechatSI.translate({
        lfrom: fromto[0],
        lto: fromto[1],
        content: text,
        success(res) {
          // if (res.retcode == 0)
          // 翻译完成
          resolve(res)
        },
        fail: function (res) {
          // 因网络问题失败
          reject({stats:'error',tip:'网络错误',res:res})
        }
      })
    })
    if (res.retcode == 0){
      // 翻译成功
      this.request_data = res
      // 解析
      this.query_result.tranInput = res.origin;
      this.query_result.tran = res.result;

    }else{
      this.request_data = {stats:'error',res:res}
    }
  }

  this.tts = async function(text){
    let res = await new Promise((resolve,reject)=>{
      this.wechatSI.textToSpeech({
        lang:"en_US",
        tts:true,
        content:text,
        success(res){
          resolve(res)
        },
        fail(res){
          reject(res)
        }
      })
    })
    if("filename" in res){
      // 合成成功
      let url = res.filename
      let path = wx.env.USER_DATA_PATH + '/temp/ss.mp3'
      this.query_result.tranInput = res.origin
      this.query_result.tran = res.result
      this.query_result.tranInput = res.origin
      this.ssAudioPath = path
      // 下载tts合成的音频，播放流畅
      download(url, path, this.ssCanPlay)
      return path
    }else{
      // 合成异常
      this.ssAudioPath = '';
      this.query_result = {};

      return false
    }

  }

  /**监测text为那种语言，zh_CN or en_US */
  this.whatLanguage = function(text){
    
  }

  /**翻译句子 */
  this.translate = async function(text, ssCanPlay = res=>{}){
    this.ssCanPlay = ssCanPlay
    await this.request(text)
    this.tts(text)

    return this.query_result
  }

  /**播放句子音频 */
  this.playSSAudio = function(){
    let audioContext = wx.createInnerAudioContext()
    audioContext.src = this.ssAudioPath
    audioContext.play()

    let time = audioContext.duration
    // console.log('time audio->', time)
    let playCount = time / 0.5
    // console.log('动画次数 =>', playCount, time)
    if (playCount == 0) {
      playCount = 3
      time = 1500
    }
    let playing = `animation:audioPlaying 0.5s ${playCount};`
    return [playing, time]
  }
}

module.exports = {
  youdaoClass: youdaoClass,
  icibaClass: icibaClass,
  wechatSIClass: wechatSIClass
}
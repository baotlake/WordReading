//index.js
//获取应用实例
const app = getApp()

const bookmgr = require('../../js/bookshelfMgr.js');
const dictjs = require('../../js/dict.js');


var that;
var readingPage; // index 和 that（全局变量）都指代onload里的this,即index.Page, index替代that,that容易混淆
var dict;    // 词典 Class， 实际使用的，引用现有的youdao or  iciba
var dictTran;   // 翻译 Class, 实际使用的，引用现有的
var youdao;
var iciba;
var wechatSI;     // 微信同声传译
var gcb;     // getClipboard Class
var sp;      //setPosition Class
var article; // articleClass 实例
var bookmarkPoint;    // 记录当前页面滚动位置，记录每次操作的单词or句子的索引
var swiperIndex = 0; // 记录当前显示的swiper index

var inputText;  // 保存时输入的Text

var show_text = "Tottenham HotspurDEL F.C. (Spurs) have a long history as an English football club based in Tottenham, London. They came into existence in 1882, became professional in 1895, and in 1901 became the only non-League club to win the FA Cup since the establishment of the Football League. \n更新说明：\n从剪贴板导入按钮移到顶部（圆圈+箭头）\n查词功能未完成（顶部的放大镜图标）\n书签、阅读历史初步完善"

function articleClass(){
  /** */
  this.bookText = ''; // 全书内容
  this.article = {article:'',sl:[],wl:[],part:{}}
  // this.article = {};
  this.preArticle = {};    // 后一页
  this.aftArticle = {};    // 前一页
  this.bookInfo = []; // [index,info]
  this.page = {
    pageSize:4000,
    start:0,
    end:0,
    autoSize:400,
    sum: 1,
    now: 1,
    next:1,
    slip: 0,   // 滑动方向，+1为向下，-1为向上
    swiper:0,
  }
  this.log_sindex;  // 用于记录点击or触摸到的句子索引，用于历史记录、书签

  /**预加载 */
  this.prepareNextPage = function(){
    console.log("预加载")
    let pre = this.page.now - 1
    let aft = this.page.now + 1
    if(pre >= 1){
      // 前一页存在,且预加载的前一页为空, 预加载
      if (!('article' in this.preArticle) || pre != this.preArticle.part.now){
        // 如果last是前一页, 则在showNextPage中已保存，不必预加载
        let pre = this.getPrePart()
        this.preArticle.article = pre[0]
        this.preArticle.part = pre[1]
        let splitList = this.splitArticle(this.preArticle.article)
        this.preArticle.sl = splitList[0]
        this.preArticle.wl = splitList[1]
        console.log('已预加载前一页')
      }else{
        console.log('前一页 预加载存在', this.preArticle)
      }
    }else{
      console.log('第一页，前一页未预加载')
    }
    if(aft <= this.page.sum){
      // 后一页存在, 预加载
      if (!('article' in this.aftArticle) || aft != this.aftArticle.part.now){
        // 如果last是后一页, 则在showNextPage中已保存，不必预加载
        let aft = this.getAftPart()
        this.aftArticle.article = aft[0]
        this.aftArticle.part = aft[1]
        let splitList = this.splitArticle(this.aftArticle.article)
        this.preArticle.sl = splitList[0]
        this.preArticle.wl = splitList[1]
        console.log('已预加载后一页')
      }else {
        console.log('后一页 预加载存在', this.aftArticle)
      }
    }else{
      console.log('最后一页，后一页未预加载')
    }
    // console.log('pre',this.preArticle.article)
    // console.log('aft', this.aftArticle.article)
  }
  /**显示next页，前一页or后一页*/
  this.showNextPage = function(){
    console.log('show Next page ->', this.page['next'], this.page['now'])
    //let next = this.page.next
    if (this.page['now'] == this.page['next'] + 1){
      // 浏览前一页，last是后一页, 即此页是前一页
      console.log('前一页')
      this.aftArticle = this.article
      console.log('preArticle ->', this.preArticle)
      if ('article' in this.preArticle) {
        console.log('使用预加载pre')
        this.article = this.preArticle
        console.log('article->', this.article)
        console.log('part start error ->', this.preArticle)
        this.page.start = this.preArticle.part.start
        this.page.end = this.preArticle.part.end
        this.page.now = this.preArticle.part.now
        this.quick()
        this.log_sindex = 0
        this.preArticle = {}
      }else{
        console.log('预加载为空=========================')
        this.showPartByPageNum(this.page['next'])
      }
      
    }else if (this.page['now'] == this.page['next'] - 1){
      // 浏览下一页，this.article 为前一页
      console.log('后一页')
      this.preArticle = this.article
      if('article' in this.aftArticle){
        console.log('使用预加载aft')
        this.article = this.aftArticle

        console.log('article->', this.article)
        this.page.start = this.aftArticle.part.start
        this.page.end = this.aftArticle.part.end
        this.page.now = this.aftArticle.part.now
        this.quick()
        this.aftArticle = {}
      }else{
        console.log('预加载为空=========================')
        this.showPartByPageNum(this.page['next'])
      }
    }else{
      // ？首页前一页，末尾页后一页，仍然是首页和末页
      // 更新swiper
      let swiper = 'page.swiper'
      readingPage.setData({
        [swiper]: this.page.swiper
      })

    }
    // 预加载
    this.prepareNextPage()
    console.log('page start end ->',this.page.start,this.page.end)
  }
  /**预测的下一页 */
  this.setNext = function(n,swiper){
    console.log('set Next ->',n)
    this.page.slip = n
    if (n == 1 || n == -1) {
      this.page.next = this.page.now + n
    }
    // 
    if (this.page.next > this.page.sum){
      this.page.next = this.page.sum
      wx.showToast({
        title:'最后一页',
        icon:'none'
      })
    }
    if(this.page.next < 1){
      this.page.next = 1
      wx.showToast({
        title: '第一页',
        icon: 'none'
      })
    }
    this.page.swiper = swiper
    console.log('next ->', this.page.next)
  }

  this.showArticle = function(){
    // setData赋值显示文章
    try{
      var bookmarks = this.bookInfo[1]['bookmarks']['list']
    }catch(e){
      var bookmarks = []
    }
    if (bookmarks == undefined){
      bookmarks = []
    }

    that.setData({
      wordList: this.article['wl'],
      page: this.page,
      bookmarks:bookmarks
    })
    // 延迟保存历史 & 显示标题
    var article = this
    setTimeout(()=>{
      this.setHistory()
      // setData文章标题
      if (readingPage.data.title == "" && this.bookInfo[1] != undefined) {
        readingPage.setData({
          title: this.bookInfo[1]['title']
        })
      }
    }, 100)

    
  }

  /** 获取整本书 */
  this.getBook =async function (id) {
    var bookMgr = new bookmgr.bookshelfClass()
    this.bookInfo = bookMgr.getBookInfo(id)
    // 如果有阅读历史，接着历史记录加载
    try {
      var start = this.bookInfo[1]['history']['read']
      if (typeof (start) == 'number') {
        // 有可用阅读历史
        // this.page.start = start
      }
    } catch (e) {}

    // 获取整本书,赋值于this.bookText
    this.bookText = await bookMgr.getBook(id)
    this.calcPageSum()
  }

  /**计算总页数 */
  this.calcPageSum = function(){
    // 计算总页数
    let sum = Math.ceil(this.bookText.length / this.page['pageSize'])
    if (this.bookText.length - this.page['pageSize'] * sum - this.page['pageSize'] / 2 > 0) {
      sum += 1
    }
    this.page.sum = sum
  }

  /**将文章分为句子和单词数组 */
  this.splitArticle = function (article) {
    // 多个空行替换为最多4行
    article = article.replace(/([\n]{4,100})/g, '\n\n\n\n');
    /** 拆分文章为单词 先以句为单位分，再以词为单位分 */
    article = article.replace(/([!?。！？])/g, '$1/LF/');
    article = article.replace(/([\s\S]+?\D\.\s)/g, '$1/LF/');
    article = article.replace(/([\s\S]+?[\.．]\s)/g, '$1/LF/');
    // this.article = this.article.replace(/([\s\S]+?\d\.(?!\d))/g, '$1/LF/');  //前后非数字“.”是否换行
    article = article.replace(/([\s\S]+?\n)/g, '$1/LF/');

    var sentenceList = article.split(/\/LF\//g);  //  (/\/LF\//g)

    /** wordList, 二维数组 */
    var wordList = []
    for (var i = 0; i <= sentenceList.length; i++) {
      if (sentenceList[i] == "") {
        // 删除空字符
        // console.log('splice =>', sentenceList[i])
        sentenceList.splice(i, 1)
        // i--
      }
    }
    // console.log('sentenceList 去掉空字符 =>', sentenceList)
    for (var i in sentenceList) {
      if (sentenceList[i] != undefined) {
        // var wordEnd = /(.*?\W)/     // 正文会被分割为单字，“hello你好”分割为“hello你”，“好”
        var wordEnd = /([a-zA-Zéà]+?)([^a-zA-Zéà]+?)/g
        var sentence = sentenceList[i]
        // console.log(sentence)
        var sentenceWordList = sentence.split(wordEnd)
        // 删除空字符
        for (var j in sentenceWordList) {
          if (sentenceWordList[j] == "") {
            sentenceWordList.splice(j, 1)
          }
        }
        wordList.push(sentenceWordList)
      }
    }
    // this.article = { 'sl': sentenceList, 'wl': wordList }
    return [sentenceList, wordList]
  }

  /**获取指定文本中可以分句的位置 */
  this.getSentenceEnd = function (text, part = {}) {
    // console.log('===GetPartEnd -> testText ->',text)
    var endPoint = ['\n\n\n', '\n\n', '。', '！', '？', '. ', '!', '?', '.', '；', ';', ',', ' ']
    for (var i in endPoint) {
      // console.log('test ->',endPoint[i])
      if (text.indexOf(endPoint[i]) != -1) {
        // console.log('GetPartEnd  text index ->', text.indexOf(endPoint[i]));
        return text.indexOf(endPoint[i]) + 1;
        break;
      }
    }
    // console.log('test fail return 0')
    return 0;
  }

  /**根据part确定某一页中文本的【开始与结束】的位置 */
  this.getPageStartEnd = function (part={}) {
    // 计算一页的开始和结尾位置，并返回
    // 需要传入参数part,
    // let part = { start: this.page.start, end: this.page.start + this.page['pageSize'], autoEnd: 400, autoStart: 400 }
    // 找分点
    let textstart = part['end'] - parseInt(part['autoEnd'] / 2)
    if (textstart < 0) textstart = 0
    let testend = part['end'] + parseInt(part['autoEnd'] / 2)
    let testEndText = this.bookText.substring(textstart, testend)

    let end = this.getSentenceEnd(testEndText) + part['end'] - parseInt(part['autoEnd'] / 2)

    textstart = part['start'] - parseInt(part['autoStart'] / 2)
    if (textstart < 0) textstart = 0
    textend = part['start'] + parseInt(part['autoStart'] / 2)
    let testStartText = this.bookText.substring(textstart, textend)
    // console.log('test testStartText ->', testStartText)

    let start = this.getSentenceEnd(testStartText) + part['start'] - parseInt(part['autoStart'] / 2)
    
    // 兼容书开头或结尾情况
    if ('start' in part ) {
      if (part['start'] < part['autoStart'] / 2) {
        // 文章开头，
        start = 0
      }
    } else if ('end' in part){
      if (this.bookText.length < part['end']) {
        // 文章结尾 小于说明text是文章末尾的一段，直接返回text的长度即可。避免将剩余的几句单拆为一页
        end = text.length
      }
    }

    return [start, end]
  }

  /**获取前一部分 */
  this.getPrePart = function(){
    // 获取前一部分
    console.log('获取前一部分')
    console.log('now page ->',this.page.now)
    let pn = this.page.now - 1
    return this.getPart(pn)
  }

  /**获取后一部分 */
  this.getAftPart = function(){
    // 获取后一部分
    console.log('获取后一部分')
    let pn = this.page.now + 1
    return this.getPart(pn)
  }

  /**显示某一页 */
  this.showPartByPageNum = function(pn){
    let data = this.getPart(pn)
    this.article.article = data[0]
    this.page['start'] = data[1].start
    this.page['end'] = data[1].end
    this.page['now'] = data[1].now
    this.article.part = this.page
    this.quick()
    this.log_sindex = 0
    // 预加载
    this.prepareNextPage()
  }

  /**获取某一页的内容，返回文本的和页信息，比如start、end、now */
  this.getPart = function(pn){
    console.log('pn ->', pn)
    let part = {
      start: this.page['pageSize'] * (pn - 1),
      end: this.page['pageSize'] * pn,
      autoStart: this.page['autoSize'],
      autoEnd: this.page['autoSize']
    }
    console.log('showPartByPageNum -> part', part)
    let [start, end] = this.getPageStartEnd(part)
    let page = {
      start:start,
      end:end,
      now:pn
    }
    return [this.bookText.substring(start, end), page]
  }

  /**slipteAticlev -> show */
  this.quick = function(){
    let splitList = this.splitArticle(this.article.article);
    this.article.sl = splitList[0]
    this.article.wl = splitList[1]
    this.showArticle();
  }

  /**第一次加载一本书 */
  this.bookMain =async function(id){
    await this.getBook(id)
    let goHistory = this.goHistory()
    if (!goHistory){
      // open history fial
      let part = { start: this.page.start, end: this.page.start + this.page['pageSize'], autoEnd: 400, autoStart: 400 }
      let [start, end] = this.getPageStartEnd(part)
      this.article.article = this.bookText.substring(start, end)
      this.page.end = end
      this.quick()
      this.prepareNextPage()
    }
    // this.calcPagePosition() //test
  }

  /**首次从文字加载书,需要注意的是从剪贴板导入并非使用此函数，剪贴板导入会被保存为一本书，存在缓存中，与正常书不一样 */
  this.textMain = function(text){
    if (text.length > 2) {
      this.bookText = text;
      this.calcPageSum()
      var part = { start:0, end:this.page['pageSize'], autoEnd: 400, autoStart: 400 }
      let [start, end] = this.getPageStartEnd(part)
      this.article.article = this.bookText.substring(start, end)
      this.page.end = end
      this.quick()
      this.prepareNextPage()
    }
  }

  /**改用this.log_sindex || 获取【当前阅读位置】，异步 */
  // this.getPosition = async function(){
    // console.log('set History')
    // let history = {
    //   'start':0,
    //   'page':1,
    //   'scrollY':0
    // }
    // history.start = this.page.start
    // history.page = this.page.now;
    // let scroll = await new Promise((resolve,reject)=>{
    //   wx.createSelectorQuery().select('.article-container-scroll').fields({
    //     scrollOffset: true
    //   },
    //   res=>{
    //     resolve(res)
    //   }
    //   ).exec()
    // })
    // let scrollY = scroll.scrollTop
    // history.scrollY = scrollY
    // // console.log('test test ->', history)
    // return history
  // }

  /**计算目标句子距离【此页开始】的长度, page position -> text position */
  this.calcLenByindex = function(sindex){
    var len = 0;
    try{
      if (typeof (sindex) == "number" ) {
        for (let i = 0; i <= sindex; i++) {
          len += article.article['sl'][i].length
        }
      }
    }catch(e){}
    return len;
  }

  /**由一个start位置计算所在页、所在句 text position -> page position */
  this.calcPagePosition = function(start){
    // 粗计算在那一页
    let pn = Math.ceil(start / this.page.pageSize)
    let checkUp = start < this.page.pageSize * pn - this.page.autoSize / 2
    let checkDown = start > this.page.pageSize * (pn - 1) + this.page.autoSize / 2
    // 矫正页数
    if(!checkUp){
      // checkDown 不必检查，
      // page 可能需要 +1
      let part = {
        start: this.page['pageSize'] * (pn - 1),
        end: this.page['pageSize'] * pn,
        autoStart: this.page['autoSize'],
        autoEnd: this.page['autoSize']
      }
      let [pstart, pend] = this.getPageStartEnd(part)
      if(start >= pend){
        pn += 1
      }
    }else if(!checkDown){
      // page可能需要-1
      let part = {
        start: this.page['pageSize'] * (pn - 1),
        end: this.page['pageSize'] * pn,
        autoStart: this.page['autoSize'],
        autoEnd: this.page['autoSize']
      }
      let [pstart, pend] = this.getPageStartEnd(part)
      if (start < pstart) {
        pn -= 1
      }
    }
    let part = {
      start: this.page['pageSize'] * (pn - 1),
      end: this.page['pageSize'] * pn,
      autoStart: this.page['autoSize'],
      autoEnd: this.page['autoSize']
    }
    let [pstart, pend] = this.getPageStartEnd(part)
    // 计算所在句子
    let testText = this.bookText.substring(pstart, start)
    let sindex = this.splitArticle(testText)[0].length - 1

    return [pn,sindex]
  }

  /**接着上次阅读 */
  this.goHistory = function(){
    let point;
    try{
      point = this.bookInfo[1]['history']['read']
    }catch(e){}
    if(typeof(point) == "number" && point != 0){
      // 有意义的历史记录
      this.goPoint(point)
      return true
    }else{
      return false
    }
  }

  /**转到某一页的某一位置，根据point,point指目标在bookText的位置 */
  this.goPoint = function(point){
    let [pn, si] = this.calcPagePosition(point)
    this.log_sindex = si
    // 打开目标页
    this.showPartByPageNum(pn)
    // 滚动到目标位置
    if (si > 3) {
      si -= 3 // 矫正
    }
    readingPage.setData({
      scrollTo: 's-' + si
    })
  }

  /**记录历史 */
  this.setHistory = function(){
    if(this.bookInfo.length > 1){
      let len = this.calcLenByindex(this.log_sindex)
      let spoint = this.page.start + len
      // 调用appjs，避免页面销毁导致未储存
      app.setBookHistory(this.bookInfo[0], this.bookInfo[1]['id'], spoint)
      // let bookMgr = new bookmgr.bookshelfClass()
      // bookMgr.setHistory(this.bookInfo[0], this.bookInfo[1]['id'], spoint)
      // console.log('set history finish')
    }

  }

  this.addBookmark = function(title){
    // 添加书签,书签对象，title  、 point
    let point = this.page.start + this.calcLenByindex(this.log_sindex)
    let bookmark = {
      title: title,
      point: point
    }
    let bookMgr = new bookmgr.bookshelfClass()
    bookMgr.addBookmark(article.bookInfo[1]['id'], bookmark)
    // 更新bookInfo
    this.bookInfo = bookMgr.getBookInfo(this.bookInfo[1]['id'])
  }

  /**转到指定书签,bi指书签在书签数组中的索引 */
  this.goBookmark = function(bi){
    let point
    try{
      point = this.bookInfo[1]['bookmarks']['list'][bi]['point']
      console.log('有效的书签 ->',point)
    }catch(e){
      console.log('无效的书签->',this.bookInfo[1])
    }
    if(typeof(point) == "number"){
      this.goPoint(point)
    }

  }

  this.deleteBookmark = function(bi){
    let bookMgr = new bookmgr.bookshelfClass()
    bookMgr.deleteBookmark(this.bookInfo[1]['id'], bi)
    // 更新bookInfo
    this.bookInfo = bookMgr.getBookInfo(this.bookInfo[1]['id'])
  }
  
}

/**分词，将句子分为单词的列表 */
function participle(text) {
  if (text) {
    let wordPart = /([a-zA-Zéà]+?)([^a-zA-Zéà]+?)/g
    let wordList = text.split(wordPart)
    console.log('wxs participle---', wordList[0], '-----', wordList[1], '-----', wordList[2])
    return wordList
  }
  return []
}

function playWordAudio(dict, type = '') {
  /** 播放读音 */
  var word_audio = wx.createInnerAudioContext()
  if (type == 'us') {
    // word_audio.src = dict.query_result['usspeech']
    word_audio.src = dict.audio.uss
  } else if (type == "uk") {
    // word_audio.src = dict.query_result['ukspeech']
    word_audio.src = dict.audio.uks
  } else if (type == "speech") {
    // word_audio.src = dict.query_result['speech']
    word_audio.src = dict.audio.s
  } else {
    // 默认, 正常不会触发
    // word_audio.src = dict.query_result['usspeech']
    word_audio.src = dict.audio.uss
  }
  // console.log('dict',dict.query_result)
  console.log('play audio.src =',word_audio.src)
  word_audio.play()
}

function aliTTSClass(){
  this.appkey = "XaGv5lEkat890WZm";
  this.token = "babaa8e31b1f460c80df3f60c1473fef";
  this.token = "ea865ce40f804098833e6e5572192f0d";
  this.text = "I looked at Miss Baker, 4.4 wondering what it was she";
  this.text = encodeURI(this.text)
  
  this.url = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?appkey=${this.appkey}&token=${this.token}&text=${this.text}&format=mp3&sample_rate=8000`

  this.test = function(text=''){
    if(text != ''){
      this.text = encodeURI(text);
      this.url = `https://nls-gateway.cn-shanghai.aliyuncs.com/stream/v1/tts?appkey=${this.appkey}&token=${this.token}&text=${this.text}&format=mp3&sample_rate=8000`
    }

    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = this.url;
    innerAudioContext.play();
    innerAudioContext.onError(res=>{
      console.log('audio play error ->',res)
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

function getClipboardClass() {
  this.clipboardData;

  this.getClipboard = async function(){
    var data = await new Promise((resolve,reject)=>{
      wx.getClipboardData({
        success(res) {
          resolve(res.data)
        }
      })
    })
    this.clipboardData = data
   
  }

  this.queryImport = function(){
    /** 询问是否导入剪贴板内容 */
    var that = this
    console.log('success callback')
    if (typeof (this.clipboardData) == "string"){
      if (this.clipboardData.length >= 2){
        console.log(this.clipboardData.length)
        /** 将剪贴板内容导入到文章中 */
        wx.showModal({
          title:"导入",
          content:"是否将剪贴板内容导入？",
          success(res){
            if(res.confirm == true){
              that.importData()
            }
          }
        })
      }else{
        wx.showToast({
          title:'剪贴板没有内容',
          icon:'none',
        })
      }
    }else{
      wx.showToast({
        title: '剪贴板没有内容',
        icon: 'none',
      })
    }
  }

  this.importData = async function(){
    console.log('importData ..')
    text = this.clipboardData
    // console.log('text ->',text)
    var bookMgr = new bookmgr.bookshelfClass()
    // var id = bookMgr.addCacheByText(text)
    var id = await bookMgr.addBookByText(text,'剪贴板导入','20190503-00-CLIP')
    console.log('导入id——》',id)
    article.bookMain(id)
  }
  
}

function setPositionClass(){
  /** 设置explain box的位置
   * explain box 要出现在单词的附近
   */
  var spc = this
  this.wordPosition = null  // t, l, h , w,
  this.targetPosition = null  // t, l
  // targetPosition 记录划词对话框的位置信息，只用到 h 和 w，所以获取一次即可
  this.explianBoxPosition = {}   // t, l, h , w,
  this.screenSize = {}  // h, w
  this.positionData = {}

  this.doSelectorQuery = async function(id){
    /** NodesRef SelectorQuery.select(string selector)
       * 获取节点的位置信息
       */
    console.log('doSelectorQuery start =>', id);
    let distance = await new Promise((resolve,reject)=>{
      wx.createSelectorQuery().select(id).boundingClientRect(
        res=>{
          let distance = {
            t: res.top,
            l: res.left,
            h: res.height,
            w: res.width
          }
          resolve(distance)
        }
      ).exec()
    })
    // console.log('distance ->->',distance)
    return distance
  }

  this.setScreenSize = function(){
    var systemInfo = wx.getSystemInfoSync()
    this.screenSize = {
      w:systemInfo.screenWidth,
      h:systemInfo.screenHeight
    }
  }

  this.calculatePosition = function(){
    /** 根据单词的 distance List计算explain box的位置 */
    // 横向位置计算
    // console.log('calculate Position => start')
    // console.log('worPosition =>', spc.wordPosition)
    // console.log('targetPosition =>', spc.targetPosition)
    // console.log('screen =>', spc.screenSize)
    var word_h_middle = spc.wordPosition['l'] + spc.wordPosition['w'] / 2
    var target_left = word_h_middle - spc.targetPosition['w'] / 2
    if(target_left < 5){
      target_left = 5
    } else if (target_left > spc.screenSize.w - spc.targetPosition.w - 5){
      target_left = spc.screenSize.w - spc.targetPosition.w - 5
    }

    // 纵向位置计算
    var target_top = spc.wordPosition['t'] - spc.targetPosition['h'] - 25  // 25 SET,set
    var arrow_style_direct = 'transform:rotate(180deg);-moz-transform:rotate(180deg);-webkit - transform: rotate(180deg);'  // 向下
    var arrow_style_top = 'top:' + String(spc.targetPosition['h'] - 2) + 'px;'
    if(target_top < 60){
      /** 太靠顶部，box 位置设为单词下面 30 SET */
      target_top = spc.wordPosition['t'] + spc.wordPosition['h'] + 25   // 25 SET
      arrow_style_direct = ''
      arrow_style_top = ''
    }
    console.log('target_position =>',{
      l: target_left,
      t: target_top
    })

    // 箭头Style计算， 纵向计算中包含箭头的方向计算
    var arrow_style_left = 'left:' + String(word_h_middle - target_left - 10) + 'px;'
    var arrow_style = arrow_style_direct + arrow_style_top + arrow_style_left
    this.positionData = {
      visibility: 'visible',
      l: target_left,
      t: target_top,
      arrowStyle: arrow_style,
    }

    return this.positionData
  }


  this.setPosition = async function(id){
    /** 查询点击单词的位置
     * 计算设定explian box的位置
     * ？为什么要获取targeTPosition（explain Box);因为explain box使用了em单位，长宽不固定
     */
    this.wordPosition = await this.doSelectorQuery('#' + id)
    if(! this.targetPosition){
      this.targetPosition = await this.doSelectorQuery('.explain-box')
    }
    let positionData = this.calculatePosition()
    // console.log('position Data->-L',positionData)
    return positionData
  }
}

/**已将operateClass的主要功能移到wxs里 */
// function operateClass_DEL(){
  // this.currentTarget = ''
  // this.touchMoveCoordinate =[]
  // this.transBoxIsUp = false

  // this.touchStart = function(e){

  // }
  
  // this.touchMove = function(e){
  //   console.log('operateClass.touchMove', e)
  //   var currentCoordinate = [e.changedTouches[0].clientX, e.changedTouches[0].clientY]
  //   if(this.touchMoveCoordinate.length == 0){
  //     this.touchMoveCoordinate[0] = currentCoordinate
  //   }else{
  //     this.touchMoveCoordinate[1]= currentCoordinate
  //   }
  // }

  // this.touchEnd = function(e){
  //   console.log('operateClass.touchEnd', e)
  //   if(this.touchMoveCoordinate.length > 1){
  //     /** 滑动 */
  //     var moveX = this.touchMoveCoordinate[1][0] - this.touchMoveCoordinate[0][0]
  //     var moveY = this.touchMoveCoordinate[1][1] - this.touchMoveCoordinate[0][1]
  //     if(Math.abs(moveX) > 20 & Math.abs(moveY) < 30){
  //       /** 横向滑动
  //        * 翻译整个句子
  //        */
  //       console.log('横向滑动 翻译', moveX, moveY)
  //       let sindex = e.target.dataset.sindex
  //       let sentence = article.article['sl'][sindex]
  //       readingPage.querySentence(sentence)
  //       // youdao.translate(sentence)
  //       this.setTransBoxUp()
  //       //test aliTTS :播放结果不理性，长句无法播放，开发工具端表现稍好
  //       // const aliTTS = new aliTTSClass()
  //       // aliTTS.test(article['article']['sl'][sindex])

  //     }else{
  //       console.log('其他滑动 xy', moveX, moveY)
  //     }
  //   }else if(this.touchMoveCoordinate.length == 1){
  //     /** 快速滑动 */
  //     console.log('快速滑动 翻译', moveX, moveY)
  //     let sindex = e.target.dataset.sindex
  //     let sentence = article.article['sl'][sindex]
  //     readingPage.querySentence(sentence)
  //     // youdao.translate(sentence)
  //     this.setTransBoxUp()
  //   }
  //   // 清除记录
  //   this.touchMoveCoordinate = []
  //   // 记录单词索引
  //   bookmarkPoint = [e.currentTarget.dataset.sindex, e.currentTarget.dataset.windex]
  // }

  // // this.setTransBoxUp = function(){
  // //   this.transBoxIsUp = true
  // //   that.setData({
  // //     transBox:{'style':'transform:translateY(-25.5vh);'}
  // //   })
  // // }

  // // this.setTransBoxDown = function(){
  // //   if(this.transBoxIsUp == true){
  // //     that.setData({
  // //       transBox: { 'style': 'transform:translateY(0);' },
  // //     })
  // //   }
  // // }
// }



Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    systemInfo:null,
    wordList:[],   // 文章解析wordList显示

    lookUp_result:{},   // 查词结果解析lookUp_result显示
    translate_result: {canPlay:false},  // 翻译结果
    transBox_p:{y:0},

    explainBox_position: { visibility:'hidden'},  // t, l, arrowStyle

    inputBox: null,   // 值改变触发wxs inputBox事件
    inputText:'',     // 书名，书签名, 查词-更多
    inputFocus:false, // input获取焦点
    page:{},      // 加载前一页，加载后一页，控制的显示与否
    bookmarks:[],  // 书签，用于显示
    dictMore:{},     // 更多查词结果
    scrollTo:'',     // 滚动到某元素，值为某元素id
    title:'',         // 显示的文章名/书名
  },

  /**options 参数说明：do='openBook',bookId = '', 
   */
  onLoad:async function (options) {
    that = this
    readingPage = this

    console.log('options ->', options)

    article = new articleClass()
    // 获取剪贴板内容， 实例化
    gcb = new getClipboardClass()

    // 词典 实例化, dict 为实际使用的词典，
    youdao = new dictjs.youdaoClass()
    youdao.init()
    iciba = new dictjs.icibaClass()
    // dict = youdao
    wechatSI = new dictjs.wechatSIClass()

    dictTran = wechatSI
    // dictTran = youdao
    dict = iciba
    //SetPosition 实例化
    sp = new setPositionClass()
    sp.setScreenSize()  // 获取屏幕尺寸


    if('bookId' in options){
      // 尝试打开bookId所指的文章
      // article.getArticle(options['bookId'])
      article.bookMain(options['bookId'])
    }else{
      article.textMain(show_text)
    }

    if('todo' in options){
      if (options['todo'] == "openClipboard"){
        // 直接打开剪贴板内容
        // this.checkClipboard()
        await gcb.getClipboard()
        gcb.importData()
      }
    }

    this.setData({
      systemInfo:wx.getSystemInfoSync()
    })




    /**移到wxs中 operate  Class 实例化
     * 用户操作
    */
    // ope = new operateClass()

    // require test
    // console.log('=================Test=================')
    // var te = new test.test()
    // te.testthis()

    var bookMgr = new bookmgr.bookshelfClass()
    // bookMgr.uploadDB()
    // bookMgr.getCloudBooksList()
    // bookMgr.downloadBook()

    // wx.cloud.callFunction({
    //   name: 'getToken',
    //   data: {},
    //   complete: res => {
    //     console.log('callFunction getToken test result: ', res)
    //   },
    // })


    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },


  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide:async function () {
    // let history = await article.setHistory()
    // console.log('hiden ->',history)
    article.setHistory()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload:async function () {
    // let history = await article.setHistory()
    // console.log('hiden ->', history)
    // let history = {'page':article.part.now}
    // console.log('')
  },


  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  /**
  * 用户点击右上角分享
  */
  onShareAppMessage: function () {

  },

  // 查词，并setData, wxs调用此函数
  lookUpWord:async function(e){
    console.log(e)
    var word_index = [e.currentTarget.dataset['sindex'], e.currentTarget.dataset['windex']]
    var query_word = article.article['wl'][word_index[0]][word_index[1]]
    query_word = query_word.replace(/\W/,'')
    let id = `w-${word_index[0]}-${word_index[1]}`
    let positionData = await sp.setPosition(id)
    positionData.id = id;
    positionData.touchX = e.touches[0].clientX;
    positionData.touchY = e.touches[0].clientY;
    console.log('positionData->',positionData)
    this.setData({
      explainBox_position: positionData
    })
    if(query_word != ''){
      // setData查词结果,位置
      let result_data = await dict.queryWord(query_word)
      result_data.id = id;
      // console.log('result_data----->',result_data)
      this.setData({
         lookUp_result: result_data,
      })
      // console.log('query_result->',result_data)

      // var query_sentence = article.article['sl'][word_index[0]]

      // 测试 iciba
      // var iciba = new icibaClass()
      // iciba.queryWord(query_word)
    }
  },

  // 直接查词，此函数调用wxs
  lookUpWordDirect:async function(e){
    console.log('直接查词 lookUpWordDirect->',e)
    // let word = e._relatedInfo.anchorTargetText;
    let sindex = e.currentTarget.dataset.sindex;
    let windex = e.currentTarget.dataset.windex;
    let word;
    if(sindex != undefined & windex != undefined){
      word = article.article['wl'][sindex][windex];
    }else{
      word = e.currentTarget.dataset.word
      // console.log('dataset-word->',word)
    }

    word = word.replace(/\W/, '')
    let id = e.currentTarget.id;
    let positionData = await sp.setPosition(id);
    positionData.id = id;
    positionData.touchX = e.touches[0].clientX;
    positionData.touchY = e.touches[0].clientY;
    this.setData({
      explainBox_position: positionData,
    })

    let result_data = await dict.queryWord(word)
    result_data.id = id;
    this.setData({
      lookUp_result:result_data
    })
  },


  hiddenExplain:function () {
    // setData 隐藏Explain Box
    if (sp.positionData['visibility'] != 'hidden'){
      var explain_hidden = 'explainBox_position.visibility'
      that.setData({
        [explain_hidden] : 'hidden',
      })
    }
  },

  toPlayAudio:function(e){
    // var word_audio = wx.createInnerAudioContext()
    // word_audio.src ="http://dict.youdao.com/dictvoice?audio=which"
    // word_audio.play()
    // console.log(e)
    var type = e.currentTarget.dataset.type
    playWordAudio(dict, type)
  },

  toPlaySentenceAudio:async function(){
    console.log('toPlaySentenceAudio')
    await dictTran.playSSAudio()
  },

  checkClipboard: async function(){
    await gcb.getClipboard()
    gcb.queryImport()
  },

  querySentence:async function(s){
    // ope.setTransBoxUp()
    let calback = function () {
      let canPlay = 'translate_result.canPlay'
      that.setData({
        [canPlay]: true
      })
      // console.log('sentenceAudio CanPlay.')
    }
    let resulteData = await dictTran.translate(s, calback)

    // 对翻译结果尝试分词，返回数组
    resulteData.tran = participle(resulteData['tran'])

    this.setData({
      // lookUp_result:resulteData,
      translate_result:resulteData,
    })
    // console.log('Page.querySentence  =>', query_sentence)
    // console.log(dict)
    // dict.translate(query_sentence)
  },

  querySentence_wxs: function (sindex){
    console.log('s->', sindex)
    let s = article.article['sl'][sindex['index']]
    this.querySentence(s)
  },

  bindtest:function(e){
    console.log('bindtest  =>' , e)
    // sp.hiddenExplainBox()
    // ope.setTransBoxDown()
  },

  /**退出页面，先保存历史记录*/
  navigateTo:function(e){
    // 保存历史记录
    article.setHistory()

    var url = e.currentTarget.dataset.url
    try{
      wx.navigateTo({
        url: url
      })
      wx.switchTab({
        url: url
      })
    }catch(e){}

  },

  setArticleTitle:async function(e){
    console.log(e)
    if(e.currentTarget.dataset.certain == 'true'){
      // 保存
      // var bookMgr = new bookmgr.bookshelfClass()
      // bookMgr.addBookByText(article.article, inputText)
      if (!inputText) inputText = 'New Article'
      await gcb.getClipboard()
      // console.log('clipboard data ->',gcb.clipboardData)
      var bookMgr = new bookmgr.bookshelfClass()
      bookMgr.addBookByText(gcb.clipboardData, inputText)
      inputText = ''  // 用完清空，避免混染
    }else{
      // 取消保存
      wx.showToast({
        title:'取消保存',
        icon:'none'
      })
      inputText = ''
    }
    // 无论是否保存,清空page.data中的inputText
    if (this.data.inputBox){
      this.setData({
        inputBox:false,
        inputText: ''
      })
    }else{
      this.setData({
        inputBox: true,
        inputText: ''
      })
    }
  },

  getInput:function(e){
    // console.log(e)
    inputText = e.detail.value
  },

  testGetBooks:function(){
    // 获取书籍
    var bookMgr = new bookmgr.bookshelfClass()
    // bookMgr.addBookByText(article)
    // bookMgr.getBooksInfo()
    bookMgr.getBooksInfo()
    var text = bookMgr.getBook('2019230-1k-test2')
    article.main(text)
  },

  goBookPage:function(e){
    // 获取book的某一页内容
    console.log('goBookPage ->e', e)
    var index = e.currentTarget.dataset.index
    article.showPartByPageNum(index)
  },

  // scroll_test:function(e){
  //   console.log('js scroll_test')
  //   console.log(e)
  // },

  /**打开输入书签标题的输入框 */
  openSaveBookmark:e=>{
    // 保存书签
    readingPage.setData({
      inputBox:'bookmark',
      inputFocus:true
    })
  },

  /**保存剪贴板内容为一本书 */
  saveBookByClip:e=>{
    // 保存文章/书，从剪贴板
    readingPage.setData({
      inputBox: 'saveBook',
      inputFocus:true,
    })
  },

  addBookmark:async function(e){
    // 添加书签,书签对象，title,start,scrollY,target
    if (!inputText) inputText ='New Bookmark';
    if (e.currentTarget.dataset.certain == 'true'){
      if(article.bookInfo[0] != undefined){
        article.addBookmark(inputText)
        wx.showToast({
          title:'保存完成',
        })
      }else{
        wx.showToast({
          title:'未保存',
          icon:'none'
        })
      }
    }else{
      wx.showToast({
        title:'取消保存',
        icon:'none'
      })
    }
    // 取消保存，清空inputText
    inputText = ''
    let newBookmarks
    try{
      newBookmarks = article.bookInfo[1]['bookmarks']['list']
    }catch(e){
      newBookmarks = []
    }

    // 无论是否保存,清空page.data中的inputText,隐藏inputBox
    // 更新bookMark的显示
    this.setData({
      inputBox: false,
      inputText: '',
      bookmarks: newBookmarks
    })

  },

  deleteBookmark:function(e){
    let bi = e.currentTarget.dataset.index
    article.deleteBookmark(bi)
    // 删除动画500ms
    setTimeout(()=>{
      readingPage.setData({
        bookmarks: article.bookInfo[1]['bookmarks']['list']
      })
    },500)
  },

  goToBookmark:function(e){
    // 转到书签，传入index
    let index = e.currentTarget.dataset.index
    console.log('go to bookmark ->',index)
    article.goBookmark(index)
  },

  swiperChange:function(e){
    
    let si = e.detail.current
    console.log('swiper change ->',si,swiperIndex)
    // si == 0 swiperIndex == 1 || si == 1 swiperIndex == 2 || si == 2 swiperIndex == 0
    if ((si == 0 && swiperIndex == 1) || (si == 1 && swiperIndex == 2) || (si == 2 && swiperIndex == 0)){
      // 向前滚动 ，si = 0 即
      console.log('向前滚动')
      article.setNext(-1,si)
    } else if ((si == 1 && swiperIndex == 0) || (si == 2 && swiperIndex == 1) || (si == 0 && swiperIndex == 2)){
      // 向后滚动
      console.log('向后滚动')
      article.setNext(1,si)
    }
    setTimeout(()=>{
      article.showNextPage()
    },500)
    // article.showNextPage()
    swiperIndex = si
  },

  //？？
  filletInput:function(e){
    let input = e.detail.value
    this.setData({
      inputText:input
    })
    this.getSuggest(input)
  },

  // 查词联想建议
  getSuggest:async function(q){
    if(q != ''){
      let dictMore = await youdao.suggest(q)
      this.setData({
        dictMore: dictMore
      })
    }
  },

  findInputClear:function(){
    this.setData({
      inputText:''
    })
  },

  setLogSindex:function(sindex){
    // console.log('set log sindex ->',sindex)
    if(typeof(sindex) == "number"){
      article.log_sindex = sindex
    }
  },

  // 长按提示7
  longtapTip:function(e){
    let tip = e.currentTarget.dataset.tip
    if(tip){
      wx.showToast({
        title: tip,
        icon: 'none'
      })
    }
  },

  inputFocus:function(){
    this.setData({
      inputFocus:true
    })
  },

  transBoxUp:function(e){
    console.log(e)
    if(e == 'down'){
      this.setData({
        transBox_p: { y: '0',s:-1}
      })
    }else{
      let s = e.sindex
      this.setData({
        transBox_p: { y: '-220','s':s }
      })
    }
  }

})




// pages/bookshelf/bookshelf.js
const bookmgr = require('../../js/bookshelfMgr.js');
var bookMgr;
var currentBook;   // 当前将要进行操作的book， 使用完清空，避免误操作,{id:''}
var inputText;     // 记录输入的内容，使用完清空，避免混染
var inputDo;       // 记录调用input的原因，要干什么
var booksList; 
var cloudBooksList;
var bookshelf;   // 当前页面引用， 用户setData或调用页面内函数


async function getClipboardData(){
  var data = await new Promise((resolve) => {
    wx.getClipboardData({
      success(res) {
        resolve(res.data)
      }
    })
  })
  return data
}

/**返回text指定长度（l），多余的以‘...’显示
 * type='0' ,表示不区分中文、英文； 默认
 * type ='1', 表示区分中英文，一个中文相当于两个英文字母，l表示中文字数
 *
 */
function myTextSlice(text, l, type = '0') {
  if (text) {
    if (type == '0') {
      if (text.length >= 0) {
        return text.substring(0, l) + '...'
      } else {
        console.log('type 0 , 较短字符')
        return text
      }
    } else if (type == '1') {
      var returnText = ''
      var hanPattern = /[^\x00-\xff]/
      if (text.length > l) {
        l = l * 2
        for (var i = 0; i < l; i++) {
          if (text.substring(i, i + 1).match(hanPattern)) {
            // 全角字符 \ 双字节字符
            returnText = returnText + text.substring(i, i + 1)
            l = l - 1
          } else if (text.substring(i, i + 1) == '') {
            console.log('遇到字符串结尾')
            // 字符串结尾
            return text
          } else {
            // 半角字符
            returnText = returnText + text.substring(i, i + 1)
          }
        }
        returnText = returnText + '...'
      } else {
        console.log('较短字符')
        returnText = text
      }
      return returnText
    }
  }
}

/**对书按时间排序 */
function collate(bookList){
  let recentList = [bookList[0]];
  for(let i=1; i<bookList.length;i++){
    for(let j=recentList.length - 1;j>=0;j--){
      try{
        var ri = recentList[j]['history']['time']
      }catch(e){
        var ri = 0
      }
      try {
        var bi = bookList[i]['history']['time']
      } catch (e) {
        var bi = 0
      }
      if(ri >= bi){
        recentList.splice(j+1, 0, bookList[i])
        break
      }else if(j == 0){
        recentList.splice(j, 0, bookList[i])
      }
    }
  }
  console.log('排序结果->',recentList)
  return recentList
}

function historyInit(booksList){
  let bookmgr = require('../../js/bookshelfMgr.js');
  let bookMgr = new bookmgr.bookshelfClass()

  for(var i =0; i<booksList.length;i++){
    if(booksList[i]['history'] == ""){
      bookMgr.setHistory(i, booksList[i]['id'], 0)
    }
  }
}

/**轻量getBookInfo,区别于bookMgr.getBookInfo
 * 可以获取到云端book的部分信息，以及不需要读写缓存
 */
function getBookInfo(id){
  // 遍历本地booksList
  for(let i in booksList){
    if(id == booksList[i]['id']){
      return booksList[i]
      break
    }
  }
  // 遍历云端booksList
  for(let i in cloudBooksList){
    if(id == cloudBooksList[i]['id']){
      return cloudBooksList[i]
      break
    }
  }
}

/**获取新用户的书 */
async function getNewUserBooks(){
  let booksObj = await bookMgr.getNewUserBook()
  let necessaryList = booksObj.necessary
  for(let i in necessaryList){
    await bookMgr.addBookByShare(necessaryList[i])
    bookshelf.refreshPage()
  }
  let recommendList = booksObj.recommend
  for (let i in recommendList) {
    // 提示？？
    await bookMgr.addBookByShare(recommendList[i])
    bookshelf.refreshPage()
  }
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    systemInfo:null,
    booksList:[],
    inputBox:null,    // 值改变触发wxs inputBox事件
    inputText:'',      // input value值
    cloudBooksList:[],   // 云端book
    currentBook:{},     // 点击book的信息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    bookshelf = this
    console.log('onLoad bookshelf ->')
    bookMgr = new bookmgr.bookshelfClass()
    booksList = bookMgr.getBooksInfo()
    historyInit(booksList) // 兼容性初始化
    this.setData({
      systemInfo:wx.getSystemInfoSync(),
      booksList:booksList
    })
    // 云端book, 包含setData显示
    this.setCloudBookList()
    // collate(booksList)

    // test
    // getNewUserBooks()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.refreshPage()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  /**点击书，进入目录或开始阅读 */
  tapBook:async function(e){
    console.log('tapBook ->', e.currentTarget.dataset.id)
    var id = e.currentTarget.dataset.id
    // 判断此Id是否在本地booKs中
    let check = bookMgr.getBookInfo(id)
    if(check[0] != undefined){
      wx.navigateTo({
        url: '../../pages/reading/reading?bookId=' + id
      })
    }else{
      // 判断是否在cloudBooks中
      let cloudCheck;
      for (let i in cloudBooksList){
        if(id == cloudBooksList[i]['id']){
          cloudCheck = true
          break
        }
      }
      if (cloudCheck){
        // 存在于cloudBooks中
        wx.showLoading({
          title:'下载中...'
        })
        var ok;
        try{
          ok = await bookMgr.downloadBook(id)
        }catch(e){}
        wx.hideLoading()
        if(ok = true){
          wx.navigateTo({
            url: '../../pages/reading/reading?bookId=' + id
          })
        }else{
          wx.showToast({
            title:'下载出错，请重试！',
            icon:'none'
          })
        }

      }
    }

  },

  /**进入阅读界面，不传参数 */
  toReadPage:function(){
    wx.navigateTo({
      url: '../../pages/reading/reading'
    })
  },

  /**进入阅读界面，并尝试获取剪贴板内容， */
  getClipboard:function(){
    wx.navigateTo({
      url: '../../pages/reading/reading?todo=' + 'openClipboard'
    })
  },

  /**记录当前要操作或将要操作的book */
  setCurrentBook:function(e){
    console.log('set currentBook----')
    let id = e.currentTarget.dataset.id;
    // console.log('set current book ->',currentBook,e)
    let currentBookInfo = getBookInfo(id)
    let local;
    let upload;
    let share;
    let type = 1;
    if ('cloud' in currentBookInfo){
      local = true;
      type = 1
      if (currentBookInfo.cloud.length > 0){
        upload = true;
        type = 3
      }
    }else{
      type = 5
    }
    // 全局变量记录
    currentBook = {
      id: id,
      bookshelf: e.currentTarget.dataset.w,
      type:type
    }
    if ('share' in currentBookInfo){
      if (currentBookInfo.share.shareLink.length > 0){
        share = true;
        type += 1
      }
    }

    let title = myTextSlice(currentBookInfo['title'], 6, '1')
    var page_currentBook = {
      title: title ,
      type:type.toString()
    }
    this.setData({
      currentBook: page_currentBook
    })
  },

  /**刷新页面数据*/
  refreshPage:async function(){
    var newBooksList = bookMgr.getBooksInfo()
    booksList = newBooksList
    this.setData({
      booksList: booksList
    })
    this.setCloudBookList(request=false)
  },

  deleteBook:async function(e){
    //  test delete book 
    var id = e.currentTarget.dataset.id
    let bookshelf;
    if(id == undefined && 'id' in currentBook){
      id = currentBook['id']
      bookshelf = currentBook.bookshelf
      currentBook = {}  // 使用完清空
    }
    console.log('bookshelf ->',bookshelf)

    var bookInfo = bookMgr.getBookInfo(id)
    let isCloud = (bookshelf=="cloud")?'云端':''
    var tip = `确认删除${isCloud}《${bookInfo[1]['title']}》吗？`
    var certain = await new Promise((resolve,reject)=>{
      wx.showModal({
        title: '删除',
        content: tip,
        success(res) {
          resolve(res.confirm)
        }
      })
    })

    if(certain && bookshelf=="cloud"){
      // 仅删除云端
      console.log('仅删除云端')
      await bookMgr.deleteCloudBook(id)
    } else if (certain){
      // 没有指定cloud，全删
      console.log('没有指定cloud，全删')
      await bookMgr.deleteBook(id)
    }
    // console.log('test_delete_book modal tip ->',certain)
    let that = this
    setTimeout(() => {
      this.refreshPage()
    }, 200)
  },

  getInput: function(e){
    inputText = e.detail.value

  },

  inputDo:function(e){
    if(inputDo == "newBook"){
      this.saveBookByClipboard(e)
    }else{
      this.renameTitle(e)
    }
    inputDo = ''
  },

  renameTitle: function (e) {
    // console.log(e)
    if (e.currentTarget.dataset.certain == 'true') {
      //重命名
      var id = currentBook['id']
      bookMgr.renameBook(id, inputText)
      inputText = ''  // 清空
      this.refreshPage()
    } else {
      // 取消重命名
      wx.showToast({
        title: '取消保存',
        icon: 'none'
      })
    }
    if (this.data.inputBox) {
      this.setData({
        inputBox: false,
        bookTitle: ''
      })
    } else {
      this.setData({
        inputBox: true,
        bookTitle: ''
      })
    }
    inputText = '' // 用完清空，避免混染
  },

  setInputText:function(e){
    // inputText
    let type = e.currentTarget.dataset.type
    if (type == "bookTitle"){
      // 给inputText赋值bookTitle,重命名书
      let id = currentBook['id']
      let isCloud = currentBook['bookshelf']
      let bookTitle = bookMgr.getBookInfo(id)[1]['title']
      inputDo = "rename"
      this.setData({
        inputText: bookTitle
      })

    }else if(type == "newBook"){
      // 设置默认新书书名
      inputDo = "newBook"
      this.setData({
        inputText: 'new Book'
      })
       inputText = 'new Book'
    }
  },

  upload:async function(e){
    // 上传至云端
    var id = e.currentTarget.dataset.id
    if (id == undefined && 'id' in currentBook) {
      id = currentBook['id']
      currentBook = {}  // 使用完清空
    }
    await bookMgr.uploadBook(id)
    that = this
    
    setTimeout((that)=>{
      that.refreshPage()
    },200)

  },

  shareBook:async function(e){
    var id = e.currentTarget.dataset.id
    if (id == undefined && 'id' in currentBook) {
      id = currentBook['id']
      currentBook = {}  // 使用完清空
    }
    let shareLink = await bookMgr.shareBook(id)
    let bookTitle = bookMgr.getBookInfo(id)[1]['title']
    shareLink = `我分享给你了《${bookTitle}》，快用英语划词阅读打开吧！share://${shareLink}/。`
    // shareLink复制到系统剪贴板
    wx.setClipboardData({
      data: shareLink
    })
  },
  
  test:function(e){
    console.log('test ->',e)
  },

  tapBook_del:function(e){
    console.log('e ->',e)
  },

  // 获取分享的书，通过shareLink, 检查剪贴板
  getShareBook:async function (e) {
    let clip_data =await getClipboardData()
    if(clip_data.length <= 1000){
      let shareLinkExtract = /^[\s\S]*?\b(\w+?&.+?&\w+?)\b[\s\S]*$/
      let shareLink = clip_data.replace(shareLinkExtract,'$1')
      console.log('提取后的shareLink->',shareLink)
      if (shareLink.match(/\w+?&.+?&\w+?/) != null){
        // 有效shareLink
        var bookMgr = new bookmgr.bookshelfClass()
        wx.showLoading({
          title:'获取中...'
        })
        console.log('shareLink ->',shareLink)
        var status = await bookMgr.addBookByShare(shareLink)
        wx.hideLoading()
        if(status.stats == 'ok'){
          wx.showToast({
            title:'添加成功！'
          })
          // 刷新页面显示, 改在后面刷新
          // setTimeout((bookshelf) => {
          //   bookshelf.refreshPage()
          // }, 200)
        }else{
          wx.showToast({
            title:"添加失败",
            icon:"none"
          })
        }
      }else{
        wx.showToast({
          title: '剪贴板未发现分享链接！',
          icon: "none"
        })
      }
    }else{
      wx.showToast({
        title:'剪贴板未发现分享链接！',
        icon:"none"
      })
    }
    // 刷新页面显示
    setTimeout(() => {
      bookshelf.refreshPage()
    }, 200)
  },

  // 保存剪贴板内容
  saveBookByClipboard: async function (e) {
    // 先隐藏inputBox
    // console.log(e)
    if (e.currentTarget.dataset.certain == 'true') {
      // 保存
      // var bookMgr = new bookmgr.bookshelfClass()
      // bookMgr.addBookByText(article.article, inputText)
      let clipboardData = await getClipboardData()
      // console.log('clipboard data ->',gcb.clipboardData)
      var bookMgr = new bookmgr.bookshelfClass()
      console.log('inputTest ->',inputText)
      await bookMgr.addBookByText(clipboardData, inputText)
    } else {
      // 取消保存
      wx.showToast({
        title: '取消保存',
        icon: 'none'
      })
    }
    // 无论是否保存,清空page.data中的inputText
    if (this.data.inputBox) {
      this.setData({
        inputBox: false,
        inputText: ''
      })
    } else {
      this.setData({
        inputBox: true,
        inputText: ''
      })
    }
    inputText = '' // 用完清空，避免混染
    this.refreshPage()
  },

  /**显示云端book list*/
  setCloudBookList:async function(request=true){
    if (request) cloudBooksList = await bookMgr.getCloudBooksList()
    // 检查bookList 在本地有没有
    for(let i in cloudBooksList){
      cloudBooksList[i]['info'] = {len:cloudBooksList[i]['len']};
      delete cloudBooksList.len;
      for (let j in booksList){
        if(cloudBooksList[i]['id'] == booksList[j]['id']){
          // cloud book 同时在本地存在
          // 重命名 不会更改 云端title 
          booksList[j]['title'] = cloudBooksList[i]['title']
          cloudBooksList[i] = booksList[j];
          break;
        }
      }
    }
    // 显示
    if (cloudBooksList){
      this.setData({
        cloudBooksList: cloudBooksList
      })
    }
  },

  /**下载云端book */
  download:async function(e){
    var id = e.currentTarget.dataset.id
    if (id == undefined && 'id' in currentBook) {
      id = currentBook['id']
      bookshelf = currentBook.bookshelf
      currentBook = {}  // 使用完清空
    }
    // 判断是否在cloudBooks中
    let cloudCheck;
    for (let i in cloudBooksList) {
      if (id == cloudBooksList[i]['id']) {
        cloudCheck = true
        break
      }
    }
    if (cloudCheck) {
      // 存在于cloudBooks中
      var ok;
      wx.showToast({
        title: '开始下载...',
        icon:'none'
      })
      try {
        ok = await bookMgr.downloadBook(id)
      } catch (e) { }
      wx.showToast({
        title: '下载完成！'
      })
    }else{
      wx.showToast({
        title: '发生错误，未下载！',
        icon:'none'
      })
    }
  },

  /**取消分享, 取消后，用分享口令无法获取到这本书*/
  cancelShare:async function(e){

  }
  
})


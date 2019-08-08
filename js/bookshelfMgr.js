/** 书架类，管理书架 */
const app = getApp()
// var bookshelfClass = function () {
//export class bookshelfClass{
// module.exports = function(){
function bookshelfClass(){
  /**书架类 */
  this.books = [];
  this.currentBook = {};
  // this.nowPage = {};
  this.user_path = `${wx.env.USER_DATA_PATH}/bookshelf/`;
  // this.booksInfo_path = `${wx.env.USER_DATA_PATH}/bookshelf/bookInfo.info`;
  this.cloud = {
    fileidPre:'cloud://release-bf6b22.7265-release-bf6b22/',
    user_bs: 'user',  // 4月12日改为 'user'  旧的：/user_bookshelf
    share_bs:'share_bookshelf',
  }
  this.cache = {
    key:'bookCache',
  }

  /**返回book Object */
  this.book = function(){
    return book = {
      id: '',
      title: '',
      info: {
        len: 0,
      },
      path: '',
      history: {
        read:0,
        time:0,
      },
      creater: {
        UnionID: '',
        nickName: '',
        avatarUrl: ''
      },
      contents: {},
      bookmarks: {},
      cloud: [],
      share:{
        type: '',  // private public
        key:'',
        shareLink:''
      }
    }
  }

  this.getBooksInfo = function(){  
    try {
      var booksInfo = wx.getStorageSync('booksInfo')
    } catch (e) {
      var booksInfo = []
    }
    if (Object.prototype.toString.call(booksInfo) != "[object Array]"){
      // booksInfo = []
    }
    this.books = booksInfo
    console.log('booksinfo ->', booksInfo)
    return booksInfo
  }

  this.storageBooksInfo =async function(){
    console.log('storage Books INfo ->', this.books)
    if(this.books.length > 0){
      await new Promise((resolve) => {
        wx.setStorage({
          key: 'booksInfo',
          data: this.books,
          success(res) {
            resolve(res)
          }
        })
      })
    }
  }

  this.getBookInfo = function(id){
    var book = {};
    var index;
    this.getBooksInfo()
    // console.log('get Book info')
    for (var i in this.books) {
      // console.log('getBook for->', this.books[i]['id'])
      if (this.books[i]['id'] == id) {
        // console.log('this book ->', this.books[i])
        book = this.books[i];
        index = i;
        break
      }
    }
    if (index == undefined) {
      console.log('getBookInfo 无结果，请检查id ->', id)
    }
    return [index, book]
  }

  this.setHistory =async function(index,id,position){
    // 设置阅读历史，position为已读位置,
    this.getBooksInfo()
    if(this.books.length > 0){
      if (this.books[index]['id'] = id) {
        // id与index匹配，添加/更新阅读历史记录
        let date = new Date()
        if (Object.prototype.toString.call(this.books[index]['history']) == "[object Object]") {
          this.books[index]['history']['read'] = position
          this.books[index]['history']['time'] = date.getTime()
        } else {
          this.books[index]['history'] = {}
          this.books[index]['history']['read'] = position
          this.books[index]['history']['time'] = date.getTime()
        }
      }
      await this.storageBooksInfo()
    }
    // console.log('setHistroy ->',this.books[index])
  }

  this.getBook = function (id, part=[]) {
    /** 获取书的内容, 并添加历史记录
     * autoEnd=400,在指定end位置附近400个字符中找合适的分句点
     * autoStart=400,在指定start位置附近400个字符中找合适的分句点
    */

    // 从本地获取
    var [index,book] = this.getBookInfo(id)
    // console.log('cache test info ->', book)
    if ('path' in book || 'cache' in book) {
      // 找到book
      if('cache' in book){
        var text = wx.getStorageSync(book['cache']['key'])
        console.log('cache test getStorage ->', text)
      }else if ('path' in book){
        const fs = wx.getFileSystemManager()
        if(book['fileType']){
          var path = `${this.user_path}${book['id']}${book['fileType']}`
        }else{
          var path = `${this.user_path}${book['id']}.txt`
        }
        // console.log('book ->', book)
        // console.log('path ->', path)
        var text = fs.readFileSync(path, 'utf-8')
        // console.log('file txt ->',text)
      }

      if(book['info']['len'] != text.length){
        // 赋新值
        book['info']['len'] = text.length
        if(this.books[index]['id'] == book['id']){
          this.books[index] = book
          this.storageBooksInfo()
        }
      }
      // console.log('获取到文章内容：->', text)

      // 找分点
      // let testEndText = text.substr(part['end'] - parseInt(part['autoEnd'] / 2), part['autoEnd'])
      // let end = this.getPartEnd(testEndText) + part['end'] - parseInt(part['autoEnd'] / 2)

      // let testStartText = text.substr(part['start'] - parseInt(part['autoStart'] / 2), part['autoStart'])
      // let start = this.getPartEnd(testStartText) + part['start'] - parseInt(part['autoStart'] / 2)
      if(part.length > 0){
        // this.nowPage = {'start':part[0],'end':part[1]}
        console.log('return text ->', part[0], part[1])
        this.setHistroy(index, book['id'], part[0])  // 添加阅读历史
        return text.substring(part[0], part[1])
      }else{
        // 全部返回
        return text
      }
    } else {
      // 未找到book
      console.log('未找到book,请检查id是否正确，id=', id)
      return ''
    }
  }

  // this.getNowPageInfo = function(){
  //   return this.nowPage
  // }

  /**获取指定文本中可以分句的位置 */
  this.getPartEnd = function(text,part={}){
    // console.log('===GetPartEnd -> testText ->',text)
    var endPoint = ['\n\n\n','\n\n','。','！','？','. ','!','?','.','；',';',',',' ']
    if('start' in part && 'end' in part){
      if(part['start'] < part['autoStart'] / 2){
        // 文章开头，
        return 0
      }
      if(text.length < part['autoEnd']){
        // 文章结尾 小于说明text是文章末尾的一段，直接返回text的长度即可。避免将剩余的几句单拆为一页
        return text.length
      }
    }

    for(var i in endPoint){
      // console.log('test ->',endPoint[i])
      if(text.indexOf(endPoint[i]) != -1){
        // console.log('GetPartEnd  text index ->', text.indexOf(endPoint[i]));
        return text.indexOf(endPoint[i]) + 1;
        break;
      }
    }
    // console.log('test fail return 0')
    return 0;
  }

  this.createId = function (len = 1) {
    /** 生成book的id
     * 需要：时间，book的字符数
     * 注意，bookId中比可以有‘*’,因为云数据库中以id作为字段名，字段名不可以有小数点，所以作了转换，将.替换为*，如果bookId中本来就有*，将导致替换出错，当然，*可以用其他符号代替。
    */
    var date = new Date()
    var timestamp = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}-`
    if (len < 1000) {
      var lenstamp = `${len}-`
    } else if (len < 10000) {
      var lenstamp = `${(len / 1000).toFixed(2)}k-`
    } else {
      var lenstamp = `${(len / 10000).toFixed(2)}w-`
    }
    var randomstamp = String.fromCharCode(Math.random() * 26 + 65) + String.fromCharCode(Math.random() * 26 + 65) + String.fromCharCode(Math.random() * 26 + 65) + String.fromCharCode(Math.random() * 26 + 65)
    var bookId = timestamp + lenstamp + randomstamp
    return bookId
  }

  this.mkdir = function(path){
    console.log('mkdir ------------')
    try{
      var fs = wx.getFileSystemManager()
      if (!fs.accessSync(path)) {
        fs.mkdir({
          dirPath: path,
          recursive: true
        })
      }
    }catch(e){
      var fs = wx.getFileSystemManager()
      fs.mkdir({
        dirPath: path,
        recursive: true
      })
    }
    console.log('==============mkdir==================end=======')
  }

  this.addBookByText =async function (text = '', title ='Article', id='') {
    /**从text添加书 */

    // 从数据缓存读取
    this.getBooksInfo()

    var book = this.book()
    if(id == ''){
      book['id'] = this.createId(text.length);
    }else{
      book['id'] = id;
    }
    book['fileType'] = '.txt';
    book['info']['len'] = text.length;
    book['title'] = title;
    let date = new Date()
    book['history']['time'] = date.getTime()

    const fs = wx.getFileSystemManager()
    this.mkdir(this.user_path)
    // 在本地用户目录下创建一个文件
    fs.writeFileSync(`${this.user_path}${book['id']}${book['fileType']}`, text, 'utf-8')
    fs.writeFileSync(`${this.user_path}${book['id']}.info`, JSON.stringify(book), 'utf-8')
    // console.log('写入文件成功', `${wx.env.USER_DATA_PATH}${book['path']}`)
    // console.log('book ->', book)
    // console.log('text  ->', text.substr(0,100))
    // try{
    //   this.books.unshift(book)
    // }catch(e){
    //   if(Object.prototype.toString.call(this.books) != "[object Array]"){
    //     this.books = []
    //   }
    //   this.books.unshift(book)
    // }
    this.addBookInfo(book);
    // wx.setStorage({
    //   key: 'booksInfo',
    //   data: this.books
    // })
    await this.storageBooksInfo()
    return book['id']
  }

  /**从剪贴板导入，未保存，缓存在此，下次导入则覆盖之 */
  this.addCacheByText = function(text){
    // 从数据缓存读取
    this.getBooksInfo()

    var book = this.book()
    book['id'] = 'cacheArticle';
    book['fileType'] = 'catch';
    book['info']['len'] = text.length;
    book['title'] = '剪贴板导入缓存'
    book['cache'] = {'key':this.cache['key']}

    wx.setStorageSync(this.cache['key'],text)
    var t = wx.getStorageSync(this.cache['key'])
    console.log('ttt====================>',t)

    var info = this.getBookInfo(book['id'])

    try {
      // console.log('info ->',info)
      if (info[0] != undefined){
        this.books[info[0]] = book
      }else{
        this.books.push(book)
      }
    } catch (e) {
      if (this.books == undefined) {
        this.books = []
      }
      if (info[0] == undefined) {
        this.books[info[0]] = book
      } else {
        this.books.push(book)
      }
    }

    this.storageBooksInfo()
    return book['id']
  }

  this.addBookBytxt = function(path){
    /**从txt添加书 */

  },

  /**删除book,同时删除本地和云端 */
  this.deleteBook = function(id){
    /**删除书，根据id,同时删除本地和云端 */
    this.getBooksInfo()
    let info = this.getBookInfo(id)
    this.deleteLocalBook(id,info)
    this.deleteCloudBook(id,info)
  },

  /**删除本地的book,忽视云端 */
  this.deleteLocalBook = function(id,info=null){
    /**删除书，根据id, info用来验证 */
    console.log('bookshelfMgr.deleteBook local  ->', id)
    if(info == null){
      this.getBooksInfo()
      info = this.getBookInfo(id)
    }
    // console.log('info ->', info)
    // 判断返回，不为空就删
    if (info[0] != undefined && 'id' in info[1]) {
      this.books.splice(info[0], 1)
      wx.setStorage({
        key: 'booksInfo',
        data: this.books
      })

      var deleteList = []

      deleteList[0] = `${this.user_path}${info[1]['id']}${info[1]['fileType']}`
      deleteList[1] = this.user_path + info[1]['id'] + '.info'

      // console.log('开始删除txt文件 path->', path)
      const fs = wx.getFileSystemManager()
      for (var i in deleteList) {
        console.log('开始删除->', deleteList[i])
        fs.unlink({
          filePath: deleteList[i],
          success(res) {
            // console.log('已删除 ->', deleteList[i])
          },
          fail(res) {
            console.log('删除txt文件失败 res,file ->', res, deleteList[i])
          }
        })
      }
    } else {
      console.log('删除book未完成，请检查 id是否正确，info:', info)
    }
  }

  /**删除云端book,忽视本地 */
  this.deleteCloudBook =async function (id,info=null) {
    /**删除书，根据id, info用来校验 */
    console.log('bookshelfMgr.deleteBook  ->', id)
    if(info == null){
      this.getBooksInfo()
      info = this.getBookInfo(id)
    }
    // console.log('info ->', info)
    // 判断返回，不为空就删
    if (info[0] != undefined && 'id' in info[1]) {
      var deleteList = []
      // 删除云端文件
      var openId = wx.getStorageSync('openid')

      if (info[1]['cloud'] != undefined) {
        if (info[1]['cloud'].length > 0) {
          console.log('开始删除云端文件 ->')
          wx.cloud.deleteFile({
            fileList: info[1]['cloud'],
            success(res) {
              console.log('删除云端文件成功 ->', info[1]['cloud']);
              console.log('res ->', res)
            }
          })
          // 删除云端数据库对应项
          const db = wx.cloud.database()
          const _ = db.command
          var bookId = info[1]['id']
          bookId = bookId.replace(/\./g, '*')
          db.collection('user').doc(openId).update({
            data: {
              [bookId]: _.remove()
            },
            success(res) {
              // console.log('db update_.remove success ->', res)
            },
            fail(res) {
              console.log('db update_.remove fail ->', res)
            }
          })
        }
        // 清空cloud
        try{
          if (this.books[info[0]]['id'] == id) {
            this.books[info[0]].cloud = []
            await this.storageBooksInfo()
          }
        }catch(e){}
      }
    } else {
      console.log('删除book未完成，请检查 id是否正确，info:', info)
    }
  }

  this.renameBook = function(id, newName){
    /**给书重命名 */
    var [index,book] = this.getBookInfo(id)
    if('title' in book && index != undefined){
      book['title'] = newName
      if(this.books[index]['id'] == book['id']){
        this.books[index] = book
        const fs = wx.getFileSystemManager()
        fs.writeFileSync(`${this.user_path}${book['id']}.info`, JSON.stringify(book), 'utf-8')
        this.refreshBookInfo(index,book['id'])
      }
    }
  },

  /**成功返回shareLink,失败返回空字符串 */
  this.shareBook = async function(id){
    /**分享书，
     * 私密分享：最后生成的分享链接格式：
     *  [UnionId]&[id]&[key]
     * 步骤：检查是否有shareLink，有直接返回，没有先生成shareLink, 并将shareLink 写入info，再将文章上传至云端
     */
    // 私密分享
    var info = this.getBookInfo(id)
    try{var share = info[1]['share']['shareLink'].length > 1}catch(e){var share = false}
    if(!share){
      if(!info[1]['share']) info[1]['share']={}
      info[1]['share']['type'] = 'private'
      info[1]['share']['key'] = 'key'

      // 生成shareLink,
      var openId = wx.getStorageSync('openid')
      if(openId == ''){
        console.log('openId 为空')
      }
      var shareLink = `${openId}&${info[1]['id']}&${info[1]['share']['key']}`
      info[1]['share']['shareLink'] = shareLink

      if (this.books[info[0]]['id'] = info[1]['id']) {
        // 冗余验证，保证books的安全
        this.books[info[0]] = info[1]
        this.storageBooksInfo()
        // 写入.info文件，直接覆盖
        const fs = wx.getFileSystemManager()
        fs.writeFileSync(`${this.user_path}${info[1]['id']}.info`, JSON.stringify(info[1]), 'utf-8')
      }

      // 上传云端，无需验证是否已经上传，直接覆盖
      let isUpload = await this.uploadBook(id)
      if(isUpload){
        console.log('share link ->', shareLink)
      }else{
        // 上传出错
        shareLink = ''
      }
    }else{
      // 有shareLink, 检查后直接返回shareLink即可
      console.log('已经分享过，shareLink = ',info[1]['share']['shareLink'])
      var shareLink = info[1]['share']['shareLink']
    }
    
    return shareLink

  },

  this.uploadBook = async function(id,file='all'){
    /**上传书至云端 file全部上传or只上传info或txt */
    // 获取需要上传的book信息
    const app = getApp()
    const that = this
    let openId = wx.getStorageSync('openid')
    if(!openId){
      openId = await app.getOpenId()
    }
    return that.doUpload(openId, id, file)
  }

  this.doUpload =async function(openId,bookId,file='all'){
    /**上传包括两部分，一部分是txt文件，另一部分是info信息 */
    var that = this
    console.log('开始上传 ->')
    var info = this.getBookInfo(bookId)

    if (bookId == "cacheArticle"){
      // console.log('上传缓存')
      return {status:'error',tip:'缓存不能上传，请先保存！'}
    }

    var uploadList =[]
    if(file == 'all' || file == 'txt'){
      uploadList.push({
        cp: `user/${openId}/bookshelf/${info[1]['id']}.txt`,
        fp: this.user_path + info[1]['id'] + '.txt'
      })
    }
    if(file == 'all'  || file=='info'){
      uploadList.push({
        cp: `user/${openId}/bookshelf/${info[1]['id']}.info`,
        fp: this.user_path + info[1]['id'] + '.info'
      })
    }
    // var cloudPath = `user_bookshelf/${openId}/${info[1]['id']}.txt`
    // var filePath = wx.env.USER_DATA_PATH + info[1]['path']
    // console.log('cloudPath & filePath ->', cloudPath,filePath)

    for(var i in uploadList){
      let fileID = await new Promise((resolve)=>{
        wx.cloud.uploadFile({
          cloudPath: uploadList[i]['cp'],
          filePath: uploadList[i]['fp'],
          success: res => {
            // console.log(res.fileID)
            // console.log('上传文件成功 ->', res.fileID)
            resolve(res.fileID)
          },
          fail: console.error
        })
      })
      // 本地info字段增加cloud字段
      if (that.books[info[0]].cloud == undefined) {
        that.books[info[0]].cloud = Array()
      }
      that.books[info[0]].cloud.push(fileID)
      that.storageBooksInfo()
    }
    // 更新数据库list
    await this.uploadDB(openId,info[1])
    return true
  }

  /**云端数据库 booklist */
  this.uploadDB = async function(openId="",bookInfo){
    /**云储存无法获取目录下的所有文件，云端的book需要维护一个数据库list记录云端存着那些书*/
    // console.log('upload DB')
    const db = wx.cloud.database()
    const _ = db.command
    if(!openId){
      openId = wx.getStorageSync('openid')
    }
    // openId = 'XMB1SlsqTi00tr5D_1'

    // bookInfo = {
    //   title:'xuniceshi222222222',
    //   id:'xuniceshi-20190435-23.1k-HJFSD',
    //   info:{len:10}
    // }

    let db_book = {
      title: bookInfo['title'],
      id: bookInfo['id'],
      len: bookInfo['info']['len'],
      intro: ''
    }

    var bookId = bookInfo['id']
    bookId = bookId.replace(/\./g,'*')

    // 直接update_.set
    var db_update = await new Promise((resolve,reject)=>{
      db.collection('user').doc(openId).update({
        data: {
          [bookId]: _.set(db_book)
        },
        success(res) {
          // console.log('db unshift success ->', res)
          resolve(res)
        },
        fail(res) {
          console.log('db unshift fail ->', res)
          reject(res)
        }
      })
    })  

    // 检查结果, 如果失败，【先add】,再重新【set】
    if (db_update.stats.updated == 0){
      // 上传失败，1.用户未使用过，add
      var db_add = await new Promise((resolve,reject)=>{
        db.collection('user').add({
          data:{
            _id: openId
          },

          success(res){
            // console.log('db add ->',res)
            resolve(res)
          },
          fail(res){
            console.log('db add fail ->',res)
            reject(res)
          }
        })
      })
      // 重新set
      var db_update = await new Promise((resolve, reject) => {
        db.collection('user').doc(openId).update({
          data: {
            [bookId]: _.set(db_book)
          },
          success(res) {
            // console.log('db unshift success ->', res)
            resolve(res)
          },
          fail(res) {
            console.log('db unshift fail ->', res)
            reject(res)
          }
        })
      })
    }

  }

  /**下载云端的book */
  this.downloadBook = async function(id){
    // cloud://release-bf6b22.7265-release-bf6b22/user/oYHhN5cMc2S6WQnjzI8yAQnyYiQE/bookshelf/2019412-1.42w-VQTX.info
    try{
      let openId = wx.getStorageSync('openid')
      // 云id
      let txtFile = `${this.cloud.fileidPre}user/${openId}/bookshelf/${id}.txt`;
      let infoFile = `${this.cloud.fileidPre}user/${openId}/bookshelf/${id}.info`;
      let fileList = [txtFile, infoFile];
      // 本地路径
      let txtPath = `${this.user_path}${id}.txt`;
      let infoPath = `${this.user_path}${id}.info`;
      let pathList = [txtPath, infoPath];

      const fs = wx.getFileSystemManager()
      for (let i in fileList) {
        // console.log('--------------for----------------')
        let tempFile = await new Promise((resolve) => {
          wx.cloud.downloadFile({
            fileID: fileList[i],
            success(res) {
              // console.log('download file success ->', res)
              resolve(res.tempFilePath)
            },
            fail(res){
              reject(res)
            }
          })
        })
        // tempFileList.push(tempFile)

        // 移动路径，重命名
        this.mkdir(this.user_path)
        await new Promise((resolve,reject) => {
          fs.rename({
            oldPath: tempFile,
            newPath: pathList[i],
            success(res) {
              resolve(res)
            },
            fail(res){
              reject(res)
            }
          })
        })
      }

      // 读取info信息并返回
      let info = fs.readFileSync(pathList[1], 'utf-8')
      // console.log('download book ->',info)
      info = JSON.parse(info)
      // return info
      // 添加bookInfo
      await this.addBookInfo(info)

      return true
    }catch(e){
      return {stats:'error',tip:e}
    }
    
  }

  /**获取云端book List, 云数据库 */
  this.getCloudBooksList = async function(){
    const db = wx.cloud.database()
    const _ = db.command
    let openId;
    try{
      openId = wx.getStorageSync('openid')
    }catch(e){}
    if(!openId){
      openId = await app.getOpenId()
      console.log('get openId ->', openId)
    }
    let data = await new Promise((resolve)=>{
      db.collection('user').where({
        _id: openId
      }).get({
        success(res) {
          // console.log('get cloud book list ->', res)
          resolve(res)
        },
        fail(res) {
          console.log('get cloud book list fia ->', res)

        }
      })
    })
    // 解析data
    var cloudList = []
    for(let i in data.data[0]){
      // 201942-16.43w-PZBE
      // 2019412-64.08w-FOWW
      // bookidpattern
      let idPattern = /\d{3,8}-[\d/.wk/*]+?-[A-Z]{2,9}/;
      if(i.match(idPattern)){
        console.log('match id pattern ->',i)
        cloudList.push(data.data[0][i])
      }else{
        // console.log('dont match id pattern ->',i)
        // console.log(i.match(idPattern))
      }
    }
    // console.log('clould list ->',cloudList)
    return cloudList
  }

  this.addBookByShare = async function (shareLink) {
    var that = this
    this.books = this.getBooksInfo()
    /** 添加别人分享的书 */
    var shareBookInfo = await this.getShareBookInfo(shareLink)
    console.log('sharebookInfo -> return ',shareBookInfo)
    if(shareBookInfo['stats']=='ok'){
      var bookInfo = shareBookInfo['bookInfo']
      var txtFile = shareBookInfo['tempFileList']['fileList'][1]['tempFileURL']
      console.log('textFile ->',txtFile)
      this.mkdir(this.user_path)
      // 写入bookInfo
      const fs = wx.getFileSystemManager()
      fs.writeFileSync(`${this.user_path}${bookInfo['id']}.info`, JSON.stringify(bookInfo), 'utf-8')
      await new Promise((resolve)=>{
        wx.downloadFile({
          url: txtFile,
          filePath: `${this.user_path}${bookInfo['id']}.txt`,
          success(res) {
            console.log('download txtFIle success ->', res)
            resolve()
          },
          fail(res) {
            console.log('download txtfile fial ->', res)
            resolve()
          }
        })
      })
      this.addBookInfo(bookInfo)
      // console.log('books ->',that.books)
      return { stats: 'ok', id: bookInfo['id']}
    }else{
      console.log('获取分享被拒绝')
      return {stats:'error',tip:'获取分享被拒绝！'}
    }
   
  }

  /**将bookInfo添加到booksList中,有查重，是添加书的步骤之一 */
  this.addBookInfo =async function(info){
    console.log('addBookINFo------------>------->')
    try {
      // 考虑重复添加
      let check = this.getBookInfo(info['id'])
      console.log(check)
      if (check[1]['id'] == info['id']) {
        // 有重复, 覆盖
        console.log('=======重复 覆盖=======')
        this.books[check[0]] = info
      } else {
        // 无重复
        console.log('=======无重复添加=======')
        this.books.unshift(info)
      }
      console.log('重复 pass')
    } catch (e) {
      // 不用考虑重复添加
      if (Object.prototype.toString.call(this.books) != '[object Array]') {
        this.books = [];
      }
      // console.log('books-------------->',that.books,typeof(that.books))
      this.books.unshift(info)
    }
    // 缓存
    await this.storageBooksInfo()
  }

  this.getShareBookInfo = async function (sharelink){
   
    // shareLink = 'oYHhN5cMc2S6WQnjzI8yAQnyYiQE&201942-16.43w-PZBE&key'

    console.log('调用云函数============================')
    var shareBookInfo = await new Promise((resolve,reject)=>{
      wx.cloud.callFunction({
        name: 'getShareBook',
        data: {
          shareLink: sharelink
        }
        // complete: res => {
        //   // console.log('callFunction test result: ', res)
        //   resolve(res['result'])
        // },
      }).then(res => {
        resolve(res.result)
      })
    })

    console.log('shareBookInfo ->',shareBookInfo)
    return shareBookInfo
  }

  this.addBookmark = function(id, bookmark){
    /**bookmarker={title,start,scrollY} */
    let [index,book] = this.getBookInfo(id)
    if(index != undefined && book['id'] == id){
      // 添加书签
      if (Object.prototype.toString.call(this.books[index]['bookmarks']) == "[object Object]"){
        if('list' in this.books[index]['bookmarks']){
          this.books[index]['bookmarks']['list'].push(bookmark)
        }else{
          this.books[index]['bookmarks']['list'] = [bookmark]
        }
      }else{
        this.books[index]['bookmarks'] = {}
        this.books[index]['bookmarks']['list'] = [bookmark]
      }
      console.log('add bookmark -> info',this.books[index])
      this.refreshBookInfo(index,book['id'])
    }else{
      console.log('添加书签出错，addBookmark id=',id)
    }
  }

  this.deleteBookmark = function(id,bi){
    let [index, book] = this.getBookInfo(id)
    if (index != undefined && book['id'] == id) {
      // 删除
      if ('list' in this.books[index]['bookmarks']) {
        this.books[index]['bookmarks']['list'].splice(bi,1)
        this.refreshBookInfo(index, book['id'])
      } else {
        // 没有书签？？
      }
    } else {
      console.log('删除书签出错，未找到book id=', id)
    }
  }

  this.refreshBookInfo = function(index,id){
    /** 更新bookInfo信息，包含三部分，  可替代storageBooksInfo
     * 一、缓存更新
     * 二、.info文件更新
     * 三、如果已上传，更新云端.info
    */
    this.storageBooksInfo()  // 一

    let bookInfo = this.books[index] // 二
    const fs = wx.getFileSystemManager()
    fs.writeFileSync(`${this.user_path}${bookInfo['id']}.info`, JSON.stringify(bookInfo), 'utf-8')
    // 三
    if(Object.prototype.toString.call(bookInfo['cloud']) == "[object Array]"){
      if(bookInfo['cloud'].length > 0){
        // 上传
        this.uploadBook(id,'info')
      }
    }
  }

  /**新用户-获取基本书 */
  this.getNewUserBook =async function(){
    const db = wx.cloud.database()
    const _ = db.command
    let data = await new Promise((resolve) => {
      db.collection('store').where({
        my_id:"newUserBooks"
      }).get({
        success(res) {
          // console.log('get cloud book list ->', res)
          resolve(res)
        },
        fail(res) {
          console.log('get cloud book list fia ->', res)

        }
      })
    })
    // console.log('new user books ->', data)
    // 新用户必要的书
    let necessaryList = data.data[0]['necessary']
    return {necessary: necessaryList}
  }

}




module.exports.bookshelfClass = bookshelfClass




// function getTempFileUrl(list) {
    //   return new Promise((resolve, reject) => {
    //     wx.cloud.getTempFileURL({
    //       fileList: list,
    //       success(res) {
    //         resolve(res)
    //       }
    //     })
    //   })
    // }

    // async function main() {
    //   var list = ['cloud://release-bf6b22.7265-release-bf6b22/user_bookshelf/oYHhN5cMc2S6WQnjzI8yAQnyYiQE/201942-16.43w-PZBE.info']
    //   var returnres = await getTempFileUrl(list)
    //   console.log('async main -return ->', returnres)
    // }

    // console.log('==================================')
    // main()
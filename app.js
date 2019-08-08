//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        // console.log('wx.getUserInfo -> res',res)
      }
    })
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
          wx.getUserInfo({
            success: res => {
              // 可以将 res 发送给后台解码出 unionId
              this.globalData.userInfo = res.userInfo

              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
    // 云服务初始化
    wx.cloud.init({
      env: 'release-bf6b22'
    })
    // 检查是否获取到OpenId
    var app = this
    wx.getStorage({
      key:'openid',
      success(res){
        console.log('getStorage  openid ->',res)
        if(res.data == ''){
          console.log('storage openid 为空')
          app.storageOpenId()
        }
      },
      fail(res){
        console.log('getStorage fail ->',res)
        // 获取并缓存OpenID
        app.storageOpenId()
      }
    })

  },
  globalData: {
    userInfo: null,
    settings: {},
  },
  getOpenId:async function(){
    // 调用云函数 ->获取OpenId，
    var openId = await new Promise ((resolve,reject)=>{
      wx.cloud.callFunction({
        name: 'getOpenId',
        // complete: res => {
        //   // console.log('call function test result', res)
        //   wx.setStorage({
        //     key: 'openid',
        //     data: res.result.openid
        //   })
        //   resolve(res.result)
        // }
      }).then(res=>{
        // console.log('promise then ->',res.result.openid)
        var openid = res.result.openid
        resolve(openid)
      })
    })
    // console.log('getopenID return openid =======',openId)
    return openId
  },
  storageOpenId: async function(){
    // console.log('--------缓存openId -----------')
    var openId = await this.getOpenId()
    console.log('point - openid awit after')
    wx.setStorage({
      key:'openid',
      data:openId
    })
    console.log('------------------storage - openID -> ',openId)
  },
  setBookHistory:function(index,id,history){
    let bookmgr = require('./js/bookshelfMgr.js');
    let bookMgr = new bookmgr.bookshelfClass()
    bookMgr.setHistory(index, id, history)
    console.log('set history finish...')
  },
  setting: function(key,value){
    // key设置键名  value设置值， setting对value不做识别、判断，只负责储存、同步
    let setting = wx.getStorageInfoSync('setting');
    if (Object.prototype.toString.call(setting) != "[object Object]"){
      // 异常, 重置
      setting = {}
    }

    //添加&更新
    setting[key] = value;
    this.globalData.setting = setting;
    
    // 储存
    wx.setStorageSync({
      key:'setting',
      data:setting
    })
  },

})
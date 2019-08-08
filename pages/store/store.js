// pages/store/store.js
const bookmgr = require('../../js/bookshelfMgr.js');
var findInput = ''  // 记录findInput的输入

Page({

  /**
   * 页面的初始数据
   */
  data: {
    systemInfo:null,
    findInput:'',
    swiperBookList:[
      {
        'image': 'cloud://release-bf6b22.7265-release-bf6b22/dev-test/gatsby-detail.png',
        'shareLink': '我分享给你了一本《The Great Gatsby》，快用英语划词阅读打开吧！share://0ZyhlB&2019428-26.98w-WXZU&key/'
      },
      {
        'image': 'cloud://release-bf6b22.7265-release-bf6b22/dev-test/shawshank-detail.png',
        'shareLink': ''
      },
      {
        'image': '',
        'shareLink': ''
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      systemInfo:wx.getSystemInfoSync()
    })
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

  findInput:function(e){
    // console.log(e)
    findInput = e.detail.value
    this.setData({
      findInput: findInput
    })
  },

  findInputClear:function(e){
    this.setData({
      findInput: ''
    })
  },

  test_getShareBook:function(e){
    var input = e.detail.value
    var shareLinkPattern = /.+?&.+?&.+?/
    if (input.match(shareLinkPattern)){
      var bookMgr = new bookmgr.bookshelfClass()
      bookMgr.addBookByShare(input)
    }
    console.log(e)
    
  },

  tapSwiper:async function(e){
    let index = e.currentTarget.dataset.index
    let shareLink = this.data.swiperBookList[index].shareLink
    if(shareLink){
      let shareLinkExtract = /^[\s\S]*?\b(\w+?&.+?&\w+?)\b[\s\S]*$/
      shareLink = shareLink.replace(shareLinkExtract, '$1')
      const bookMgr = new bookmgr.bookshelfClass()
      wx.showLoading({
        title: '获取中...'
      })
      console.log('shareLink ->', shareLink)
      let stats = await bookMgr.addBookByShare(shareLink)
      if(stats.stats == 'ok'){
        let id = stats.id
        // 下载成功 转到阅读页面
        wx.navigateTo({
          url: '../../pages/reading/reading?bookId=' + id
        })
      }else{
        // 失败
      }
      wx.hideLoading()

    }
  },

  goStoreList:function(e){
    let type1 = e.currentTarget.dataset.type1;
    let type2 = e.currentTarget.dataset.type2;
    wx.navigateTo({
      url:`../../pages/storeList/storeList?type1=${type1}&type2=${type2}`
    })
  }
})
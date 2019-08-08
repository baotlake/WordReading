// pages/storeList/storeList.js
const bookmgr = require('../../js/bookshelfMgr.js');

/**解析onload中options携带的参数，确定用户需要的book / article 类型
 * 从数据库获取，并返回
 */
async function getStoreDB(options){
  // console.log('options ->',options)
  let type1 = options.type1;
  let type2 = options.type2;
  // 验证type1,2是否合法

  // 数据库id
  if (type1 == "cet4") type1 = 'Find-cet4-4527254'
  if (type1 == "cet6") type1 = 'Find-cet6-1452524'
  if (type1 == "postgraduate") type1 = 'Find-postgraduate-183844'
  // if (type1 == "cet4") type1 = 'Find-cet4-4527254'

  // console.log('type ->', type1, type2)
  // 获取数据
  const db = wx.cloud.database()
  const _ = db.command
  let data = await new Promise((resolve,reject)=>{
    db.collection('store').doc(type1).field({
      [type2]: true
    }).get({
      success(res) {
        console.log('get db success->',res)
        resolve(res.data[type2])
      },
      fial(res) {
        console.log('get db fail->', res)
        reject()
      }
    })
  })


  console.log('data ->', data)
  return data
}

function setTitle(options){
  let type1 = options.type1;
  let type2 = options.type2;
  
  let title =''

  // 标题
  if (type1 == "cet4") title = '四级'
  if (type1 == "cet6") title = '六级'
  if (type1 == "postgraduate") title = '考研'

  // 副标题
  if(type2 == 'reading') title = title + '-阅读'
  if (type2 == 'writing') title = title + '-写作'
  if (type2 == 'listening') title = title + '-听力'
  if (type2 == 'translate') title = title + '-翻译'

  return title
}


Page({

  /**
   * 页面的初始数据
   */
  data: {
    systemInfo:null,
    listTitle:'',
    dataList:[],     // 显示的list信息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 导航栏高度适配
    this.setData({
      systemInfo:wx.getSystemInfoSync()
    })
    // 设置标题
    let title = setTitle(options)
    this.setData({
      listTitle:title
    })

    // 获取数据库数据
    this.getData(options)
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

  getData: async function (options){
    let dataList = await getStoreDB(options)
    this.setData({
      dataList: dataList
    })
  },

  navigateBack:function(){
    wx.navigateBack({
    })
  },

  test:function(e){
    console.log('tests->',e)
  },

  downloadBookAndGo: async function (e) {
    console.log('downloadBookAndGo->',e)
    let shareLink = e.currentTarget.dataset.sharelink
    if (shareLink) {
      let shareLinkExtract = /^[\s\S]*?\b(\w+?&.+?&\w+?)\b[\s\S]*$/
      shareLink = shareLink.replace(shareLinkExtract, '$1')
      const bookMgr = new bookmgr.bookshelfClass()
      wx.showLoading({
        title: '获取中...'
      })
      console.log('shareLink ->', shareLink)
      let stats = await bookMgr.addBookByShare(shareLink)
      if (stats.stats == 'ok') {
        let id = stats.id
        // 下载成功 转到阅读页面
        wx.navigateTo({
          url: '../../pages/reading/reading?bookId=' + id
        })
      } else {
        // 失败
      }
      wx.hideLoading()

    }
  },
})
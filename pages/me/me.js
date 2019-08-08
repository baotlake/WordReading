// pages/me/me.js
var me;  // 相当于onLoad 里的this
var todo; 
var currentO = {}; // 记录当前操作对象的信息，格式{}
var inputText; // 记录输入内容

/**绘制使用情况的函数 */
function drawLine(list = []){
  list = [5, 20, 29, 74, 42, 6, 42];
  console.log('drawLine')
  let imgLine = wx.createCanvasContext('use_info');
  let canvasW = 300;  // canvas 宽
  let canvasH = 100;  // canvas 高

  let step = canvasW / ( list.length + 1 )
  let d_X = step;

  imgLine.setLineWidth = 5;
  imgLine.setStrokeStyle('#1c80ff')
  imgLine.setTextAlign('center')
  let grd = imgLine.createLinearGradient(0, 0, 0, canvasH);
  grd.addColorStop(0, '#1c80ff') //rgba(28,128,255,0.6)
  grd.addColorStop(1, '#ffffff')
  imgLine.setFillStyle(grd)


  imgLine.moveTo(d_X,canvasH - list[0])
  for(let i =1; i< list.length; i++){
    d_X += step;
    imgLine.lineTo(d_X, canvasH - list[i]);
  }
  // imgLine.closePath()
  imgLine.fill()
  imgLine.stroke()
  imgLine.draw()
}

function todoClass(){
  this.todo = [];
  // 读取
  this.getD = function(){
    let todoD = wx.getStorageSync('todo');
    if (!todoD) {
      todoD = [
        '⛳可以在这里记下要做的事！',
        '👉比如每天阅读一小时 🎓',
        '💡记的坚持下去哦，✊加油！',
        '☁☕💡📝🔍❌❗',
      ]
    }
    this.todo = todoD
    this.setD()
  }
  
  // 编辑
  this.edit = function(index,text){
    console.log('todo edit',text)
    this.todo[index] = text
    // 为空则删除
    if(this.todo[index].match(/\s*/)[0]){
      this.todo.splice(index, 1)
      console.log('删除')
    }
    this.setD()
  }

  // 添加
  this.add = function(text){
    console.log('todo add')
    this.todo.push(text)
    this.setD()
  }

  // setData
  this.setD = function(){
    me.setData({
      todo:this.todo
    })
    // 储存
    wx.setStorageSync('todo',this.todo)
  }
}

Page({

  /**
   * 页面的初始数据
   */
  data: {
    todo:[],
    textareaValue:'',
    inputFocus:false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    me = this
    // drawLine()
    // wx.openSetting({})

    todo = new todoClass()
    todo.getD()
    
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

  tapTodo:function(e){
    let index = e.currentTarget.dataset.index;
    
  },

  eidtTodo:function(index){
    console.log('eidt todo',index)
    // 编辑
    this.setData({
      textareaValue:todo.todo[index],
      inputFocus:true,
    })

    // inputText赋值
    inputText = todo.todo[index]

    // 记录
    currentO = {
      who: 'todo',
      todo: 'edit',
      index:index
    }
  },

  // 记录输入
  input:function(e){
    inputText = e.detail.value;
  },

  newTodo:function(){
    currentO = {
      who:'todo',
      todo:'newTodo'
    }
    this.setData({
      inputFocus:true,
    })
  },

  inputDone:function(e){
    console.log('input', e)
    console.log('currentO,',currentO)
    console.log('inputText->',inputText)
    // input = e.detail.value;
    let inputTodo;
    if('todo' in currentO){
      if(currentO.todo == 'newTodo'){
        inputTodo = 'newTodo';
      } else if (currentO.todo == 'edit'){
        inputTodo = 'eidtTodo'
      }else{
        console.log('未定义inputDone行为 ->',currentO)
        console.log(currentO.todo, 'edit')
      }
    }
    // 为何输入
    if (inputTodo == 'newTodo'){
      console.log('add')
      todo.add(inputText)
    } else if (inputTodo == 'eidtTodo'){
      let index = currentO.index
      todo.edit(index, inputText)
    } else {
      console.log('未定义inputDone行为 ->', currentO)
    }

    // 清空上次输入记录
    inputText = ''
    currentO = {}
    this.setData({
      textareaValue:''
    })
  }
})
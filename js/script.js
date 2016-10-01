var myapp = angular.module('sortableApp', ['ui.sortable']);



myapp.controller('sortableController', function ($scope, $http, $timeout) {
  
  $scope.metrics = [];
  $scope.unused = [];
  $scope.all = [];
  $scope.used = [];
  $scope.deckIndex = 0;
  $scope.deckName = "Deck #1";
  $scope.filters = {
    filterText:"",
    hideEvent:false,
    hideChampion:false,
    hideCost0:false,
    hideCost1:false,
    hideGreen:false,
    hideBlue:false,
    hideRed:false,
    hideWhite:false
  }

  //load metrics and card data
  $http.get('data/metrics.json').then(function(res1){

    $scope.metrics = res1.data;  

    $http.get('data/cards.json').then(function(res2){    
        
      $scope.all = [];
      for (var i=0; i<res2.data.length; i++){
        var cIn = res2.data[i];
        var cNew = {};
        cNew.quantity = 2;
        cNew.id = cIn[0];
        cNew.text = cIn[1];
        cNew.name = cIn[2];
        cNew.image = cIn[3];
        cNew.event = cIn[4];
        cNew.color = cIn[5];
        cNew.cost = cIn[6];
        cNew.ambush = cIn[7];
        cNew.ally = cIn[8];
        cNew.loyalty = cIn[9];
        cNew.offense = cIn[10];
        cNew.defense = cIn[11];
        cNew.class = cIn[12];
        cNew.damage = cIn[13];
        cNew.removal = cIn[14];
        cNew.draw1 = cIn[15];
        cNew.draw2 = cIn[16];
        cNew.draw2Option = cIn[17];
        cNew.recycle = cIn[18];
        cNew.drawOther = cIn[19];
        cNew.recall = cIn[20];
        cNew.searchText = (cIn[2]+"~"+cIn[1]+"~"+cIn[12]+"~"+cIn[10]+"~"+cIn[11]).toLowerCase();
        $scope.all.push(cNew);
        $scope.unused.push(cNew);
      }

      $scope.changeDeck(0);
    });

  });


  $scope.onListChanged = function(){ //may call twice, one for each list
      var u = $scope.used;
      var m = $scope.metrics;

      ////////////////////////// Zero out all values
      for (var i=0; i<m.length; i++){
         for (var j=0; j<m[i].vars.length; j++){
           m[i].vars[j].value = 0;
         }
      }

      ////////////////////////// Total count
      var total = 0;
      for (i=0; i<u.length; i++){
        var item=u[i];
        item.quantity = parseInt(item.quantity);
        total+=item.quantity;
      }
      var mQuantity = m[0];
      mQuantity.vars[0].value = total;


      ///////////////////////// Color proportions
      var mColors = m[1];
      mColors.vars = [];
      var tempColorValues = [
        {'t':0,'l':[0,"#6c0c1c","Evil: Loyal/Ally"],'o':[0,"#9E394A","Evil: Other"]},
        {'t':0,'l':[0,"#0a3415","Wild: Loyal/Ally"],'o':[0,"#2F5D3C","Wild: Other"]},
        {'t':0,'l':[0,"#212f59","Sage: Loyal/Ally"],'o':[0,"#52618A","Sage: Other"]},
        {'t':0,'l':[0,"#9f9b51","Good: Loyal/Ally"],'o':[0,"#FBFACC","Good: Other"]}
      ];
      for (i=0; i<u.length; i++){
        var item=u[i];
        var temp;
        if (item.color=="r") temp = tempColorValues[0];
        else if (item.color=="g") temp = tempColorValues[1];
        else if (item.color=="b") temp = tempColorValues[2];
        else temp = tempColorValues[3];
        if (item.loyalty || item.ally) temp.l[0]+=item.quantity;
        else temp.o[0]+=item.quantity;
        temp.t+=item.quantity;
      }
      tempColorValues.sort(function(a, b){return b.t-a.t});
      for (i=0; i<tempColorValues.length; i++){
        var item=tempColorValues[i];
        mColors.vars.push( {"name":item.l[2], "color":item.l[1], "value":item.l[0]} );
        mColors.vars.push( {"name":item.o[2], "color":item.o[1], "value":item.o[0]} );
      }

      mColors.max = total;


      ///////////////////////// Speed
      var mSpeed = m[2];
      for (i=0; i<u.length; i++){
        var item=u[i];
        if (item.cost==0) mSpeed.vars[0].value+=item.quantity;
        else if (item.event>0 || item.ambush>0) {
          if (item.event>0 && item.ambush>0) {
            mSpeed.vars[1].value +=item.quantity; //surprise attack compensates for a non-ambush champ
            mSpeed.vars[2].value -=item.quantity; 
          }
          mSpeed.vars[1].value +=item.quantity; 
        }
        else mSpeed.vars[2].value +=item.quantity;
      }
      mSpeed.max = mSpeed.vars[0].value+mSpeed.vars[1].value+mSpeed.vars[2].value;

      ///////////////////////// Card Draw
      var mDraw = m[3];
      for (i=0; i<u.length; i++){
        var item=u[i];
        if (item.draw1>0) mDraw.vars[0].value+=item.quantity;
        if (item.draw2>0) mDraw.vars[1].value+=item.quantity;
        if (item.draw2Option>0) mDraw.vars[2].value+=item.quantity;
        if (item.recycle>0) mDraw.vars[3].value+=item.quantity;
        if (item.drawOther>0) mDraw.vars[4].value+=item.quantity;
        if (item.recall>0) mDraw.vars[5].value+=item.quantity;
      }
      mDraw.max = total;


      ///////////////////////// Damage & Removal (ADD BULK WIPES)
      var mDamage = m[4];
      for (i=0; i<u.length; i++){
        var item=u[i];
        if (item.damage>0) mDamage.vars[0].value+=item.quantity;
        if (item.removal>0) mDamage.vars[1].value+=item.quantity;
      }
      mDamage.max = total;


      ///////////////////////// Offense
      var mOffense = m[5];
      for (i=0; i<u.length; i++){
        var item=u[i];
        if (item.event>0) continue;
        if (item.offense>12) mOffense.vars[0].value+=item.quantity;
        else if (item.offense>9) mOffense.vars[1].value+=item.quantity;
        else if (item.offense>6) mOffense.vars[2].value+=item.quantity;
        else if (item.offense>3) mOffense.vars[3].value+=item.quantity;
        else mOffense.vars[4].value+=item.quantity;
      }
      mOffense.max = total;


      ///////////////////////// Classes
      var mClasses = m[6];
      //get counts for all classes
      var classCounts = [];
      for (i=0; i<u.length; i++){
        var item=u[i];
        classArray = item.class.split(" ");
        for (j=0; j<classArray.length; j++){
          thisClass = classArray[j];
          if (thisClass!=""){
            exists=false;
            for (j=0; j<classCounts.length;j++){
              if (thisClass == classCounts[j].name) {
                classCounts[j].value+=item.quantity;
                exists = true;
              }
            }
            if (!exists) classCounts.push({"name":thisClass, "value":item.quantity});
          }
        }
      }
      //sort to get top classes
      classCounts.sort(function(a, b){
        if(a.value > b.value) return -1;
        if(a.value < b.value) return 1;
        return 0;
      });
      //set metric for top classes
      var classTotal = 0;
      for (i=0; i<6; i++){
        if (classCounts.length>i){
          mClasses.vars[i].name = classCounts[i].name; 
          mClasses.vars[i].value = classCounts[i].value; 
          classTotal += classCounts[i].value
        }
        else {
          mClasses.vars[i].name = ""; 
          mClasses.vars[i].value = 0; 
        }
      }

      mClasses.max = Math.max(total,classTotal);

      $scope.saveDeck($scope.deckIndex);
  }

  
  $scope.sortableOptions = {
    placeholder: "placeholder",
    connectWith: ".card-list",
    stop: $scope.onListChanged
  };

  $scope.saveDeck = function(index){

    var str=$scope.deckName;
    for (var i=0; i<$scope.used.length; i++){
      str+= "|"+$scope.used[i].id+"_"+$scope.used[i].quantity;
    }

    console.log("Save:"+str)
    window.localStorage.setItem("deck"+index, str);
  }

  $scope.loadDeck = function(index){
    var deckString =window.localStorage.getItem("deck"+index);
    var deckArray = [];
    if (deckString != null) deckArray = deckString.split("|");

    $scope.used = [];
    $scope.unused = $scope.all.slice();
    console.log("Load:"+deckString)
    if (deckArray[0]) $scope.deckName = deckArray[0];
    for (var i=1; i<deckArray.length; i++){
      var cardArray = deckArray[i].split("_");
      for (var j=0; j<$scope.unused.length; j++){
        var card = $scope.unused[j];
        if (cardArray[0]==card.id){
          card.quantity = cardArray[1];
          $scope.used.push(card);
          $scope.unused.splice(j,1);
          j--;
        }
      }
    }
    $scope.onListChanged();
    //$("#deck-name").val($scope.deckName);
  }
  $scope.clearDeck = function(){
    $scope.used = [];
    $scope.unused = $scope.all.slice();
    $scope.onListChanged();
    $scope.deckName = "Deck #"+($scope.deckIndex+1);
    $("#deck-name").val($scope.deckName);
    $scope.saveDeck($scope.deckIndex);
  }

  $scope.changeDeck = function(index){
    $scope.deckIndex=index;
    $scope.loadDeck(index);
  }


  $scope.useCard = function(card){
    for (var i=0; i<$scope.unused.length; i++){
      if ($scope.unused[i].id == card.id) {
        $scope.unused.splice(i,1);
        $scope.used.push(card);
        $scope.onListChanged();
        break;
      }
    }
  }
  $scope.unuseCard = function(card){
    for (var i=0; i<$scope.used.length; i++){
      if ($scope.used[i].id == card.id) {
        $scope.used.splice(i,1);
        $scope.unused.push(card);
        $scope.onListChanged();
        break;
      }
    }
  }

  $scope.showMetricTip = function(index){
    $("#metric-dialog div").hide();
    $("#metric-dialog div").eq(index).show();
    $("#metric-dialog").css("top",125+index*60).show();
  }
  $scope.hideMetricTip = function(index){
    $("#metric-dialog").hide();
  }

  $scope.checkFilter = function(card){
    out=false;
    if ($scope.filters.hideEvent && card.event==1) out=true;
    else if ($scope.filters.hideChampion && card.event==0) out=true;
    else if ($scope.filters.hideCost0 && card.cost==0) out=true;
    else if ($scope.filters.hideCost1 && card.cost==1) out=true;
    else if ($scope.filters.hideGreen && card.color=="g") out=true;
    else if ($scope.filters.hideBlue && card.color=="b") out=true;
    else if ($scope.filters.hideRed && card.color=="r") out=true;
    else if ($scope.filters.hideWhite && card.color=="w") out=true;
    else if ($scope.filters.filterText!=""){
      var filter = $scope.filters.filterText.toLowerCase();
      if ( (card.searchText).indexOf( filter )<0 ) out=true
    }
    return out;
  }

  var timer;
  $scope.currentCard=null;
  $scope.onDownCard = function(card){
    timer = $timeout(function () {
      $scope.currentCard = card;
    }, 250);
  }
  $scope.onUpCard = function(){
    $timeout.cancel(timer);
    $scope.currentCard = null;
  }
  

  $scope.testDeck = [];
  $scope.testHand = [];
  $scope.hasMulliganed = false;
  $scope.showHand = function(){
    if (!$scope.checkDeckSize()) return;

    $scope.hasMulliganed = false;
    $scope.testDeck = [];
    var count=0;
    for (var i=0; i<$scope.used.length; i++){
      var tempCard = $scope.used[i];
      for (var j=0; j<tempCard.quantity; j++){
        var temp2Card = JSON.parse(JSON.stringify(tempCard));
        temp2Card.isSelected = false;
        $scope.testDeck.push( temp2Card );
      }
    }
    $scope.testDeck = shuffleArray($scope.testDeck);
    
    $scope.testHand = [];
    $("#hand").show();
    for (i=0; i<5; i++){
      $scope.drawCard();
    }
  }
  $scope.drawCard = function(){
    var temp = $scope.testDeck.splice(0,1)[0];
      console.log("draw card:",temp);
      $scope.testHand.push(temp);
  }
  $scope.hideHand = function(){
    $("#hand").hide();
  }

  $scope.getHandOffset = function(){
    var cardWidth = 177;
    var cards = $scope.testHand;
    var winW = $(window).width();
    var offset=0;
    if (cards.length*cardWidth < winW){
      offset = (winW - cards.length*cardWidth)/2;
    } 
    else {
      offset = winW - cards.length*cardWidth - 10;
    }
    return offset+"px";
  }

  $scope.selectCard = function(card){
    if ($scope.hasMulliganed) return;
    console.log(card);
    card.isSelected = !card.isSelected;
  }

  $scope.doMulligan = function(){
    console.log("mulligan?"+$scope.hasMulliganed) 
    if ($scope.hasMulliganed) return;
    var removedOne=false;
    for (var i=0; i<$scope.testHand.length; i++){
      var card = $scope.testHand[i];
      if (card.isSelected){
        $scope.testHand.splice(i,1);
        i--;
        $scope.drawCard();
        console.log( "remove",card );
        removedOne=true;
      }
    }
    if (removedOne) $scope.hasMulliganed = true;
  }
  $scope.doDraw = function(){
    $scope.drawCard();
    $scope.hasMulliganed = true;
  }
  $scope.checkMulligan = function(){
    if ($scope.hasMulliganed) return false;
    var out=false;
    for (var i=0; i<$scope.testHand.length; i++){
      if ($scope.testHand[i].isSelected) out=true
    }
    return out;
  }


  $scope.checkDeckSize = function(){
    var size = 0;
    for (var i=0; i<$scope.used.length; i++){
      size += $scope.used[i].quantity;
    }
    return size>14;
  }
  angular.element(document).ready(function(){
    $(function() {
      setTimeout(function(){
        $("#left, #right").show();
        $("#splash").hide();
        onResize();
      },100);
    });
  });

});



$(function() {
  $(window).resize(onResize);
});

function onResize(){
  var winH = $(window).height();
  var winW = $(window).width();
  //console.log("resize:"+winW+","+winH);
  $("#all, #left").height( winH );
  $(".card-list, .list-wrapper").height( winH - 70 );
  $("#instructions").height( winH - 86 );
  if (winH>800) $(".metric-bar, .metric-bar-portion ").height(16);
  else if (winH>600) $(".metric-bar, .metric-bar-portion ").height(12);
  else $(".metric-bar, .metric-bar-portion ").height(8);
  var metricH = 10;//Math.max(0, ((winH-500)-$("metrics").height())/2 );
  $("#metrics").css("margin-top", metricH );
  $("#splash img").toggle(winH/winW>.55)

  $("#metrics .metric:eq(6)").toggle(winH>650);
  $("#metrics .metric:eq(5)").toggle(winH>570);
  $("#metrics .metric:eq(4)").toggle(winH>510);
  $("#metrics .metric:eq(3)").toggle(winH>460);
  $("#metrics .metric:eq(2)").toggle(winH>400);
  $("#metrics .metric:eq(1)").toggle(winH>350);
  $("#metrics .metric:eq(0)").toggle(winH>300);
}

var shuffleArray = function(array) {
  var m = array.length, t, i;
  while (m) {
    i = Math.floor(Math.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}
// deck name: default, save on change
// instructions
// show card, not on qty change

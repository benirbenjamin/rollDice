'use strict';
//Declaring variables
let currentPlayer=0
const player0Name=document.getElementById('name--0')
const player1Name=document.getElementById('name--1')

let playerEl=document.querySelector('player--0')
let playerEl1=document.querySelector('player--1')
const btnRollDice=document.querySelector('.btn--roll')
const currentScore0=document.getElementById('current--0')
const currentScore1=document.getElementById('current--1')
const message=document.querySelector('.dice-message')
// const currentScore1=document.getElementById('current--1')
const diceElement=document.querySelector('.dice')
const btnHold=document.querySelector('.btn--hold')
const btnNewGame=document.querySelector('.btn--new')
const scoreEl0=document.getElementById('score--0')
const scoreEl1=document.getElementById('score--1')

const btnSubmitPly=document.getElementById('start')
document.querySelector('.playersinput').classList.remove('hidden')
// const score1Element=document.getElementById('score--1')
// const nameOf0Player=prompt("What is first palyer's name?")
// const nameOf1Player=prompt("What is Second Player's name")
 let nameOf1Player
 let nameOf0Player
let currentScore=[0,0]
let score=[0,0]
let winner
let playing=true
let players=[nameOf0Player,nameOf1Player]

btnSubmitPly.addEventListener('click', function(){
    
    nameOf0Player=document.getElementById('plyname--0').value
    nameOf1Player=document.getElementById('plyname--1').value
    if(nameOf0Player===""|| nameOf1Player===""){
        document.querySelector('.plyMessage').textContent="Please input names";
    }else{
    document.querySelector('.playersinput').classList.add('hidden')
    document.querySelector('.gameInterface').classList.remove('hidden')

    player0Name.textContent=nameOf0Player
    player1Name.textContent=nameOf1Player
    players=[nameOf0Player,nameOf1Player]

}})

//checking the winner
//adding event listener to roll dice event
// document.getElementById('btnclose').addEventListener('click', function(){
//     console.log('buttonn');
//     document.querySelector('.playersinput').classList.add('hidden')
// })
scoreEl0.textContent=score[0]
scoreEl1.textContent=score[1]


if(playing){
    
const updtElements=function(dice){
    diceElement.src=`dice-${dice}.png`
    currentScore[currentPlayer]+=dice
    document.getElementById(`current--${currentPlayer}`).textContent=currentScore[currentPlayer]
 

}
btnRollDice.addEventListener('click', function(){
    const dice=Math.trunc(Math.random()*6)+1
    console.log(dice);
    
    if(dice!==1){
       updtElements(dice)
    //    currentScore+=dice
    
}
    else{
        //switch to player 2
        currentScore[currentPlayer]=0
        document.getElementById(`current--${currentPlayer}`).textContent=`Failed! You rolled 1`
        document.querySelector(`.player--${currentPlayer}`).classList.remove('player--active')
        currentPlayer=currentPlayer===0?1:0
        document.querySelector(`.player--${currentPlayer}`).classList.toggle('player--active')
        // currentPlayer===0?currentScore0.textContent=currentScore:currentScore1.textContent=currentScore
        // if(currentPlayer===0){
        //     currentPlayer=1
        //     document.querySelector('player--0)
        // }else{
        //     currentPlayer=0
        //     playerEl.classList.toggle('player--active')
        //     playerEl1.classList.toggle('player--active')
        // } 
    }


})
}

//holding scores and switching players
if(playing){
btnHold.addEventListener('click', function(){

score[`${currentPlayer}`]+=currentScore[currentPlayer]
document.getElementById(`score--${currentPlayer}`).textContent=score[currentPlayer]
currentScore[currentPlayer]=0
document.getElementById(`current--${currentPlayer}`).textContent=currentScore[currentPlayer]

document.querySelector(`.player--${currentPlayer}`).classList.remove('player--active')

if(score[currentPlayer]>=300){
    //console.log(`${score[currentPlayer]}>=20`);
    playing=false
    winner=players[currentPlayer]
    console.log(winner)
    message.classList.remove('hidden')
    message.textContent=`⚠⚠⚠ Game over!!${winner} is the winner`
    btnRollDice.setAttribute('disabled', '')
    btnHold.setAttribute('disabled', '')
   
}
else{
    currentPlayer=currentPlayer===0?1:0

document.querySelector(`.player--${currentPlayer}`).classList.toggle('player--active')
}
//checking the winner

    //     if(currentPlayer===0){
        // scoreEl0.textContent=score[currentPlayer]
        //  currentScore0.textContent=currentScore
//  currentPlayer=1
//  playerEl1.classList.toggle('player--active')
//  playerEl.classList.toggle('player--active')

//     }
//  else{scoreEl1.textContent=score[currentPlayer]

//     currentScore1.textContent=currentScore
//     currentPlayer=0
//     playerEl.classList.toggle('player--active')
//     playerEl1.classList.toggle('player--active')
//  }

})
}
btnNewGame.addEventListener('click', function(){

    document.location.reload()
})
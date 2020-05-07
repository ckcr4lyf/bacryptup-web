var modal = document.getElementById("modal");
var tabs = [];
var tenmb = 1024 * 1024 * 10;
var anon = true;
var uploadLimit = tenmb;

var instructions = {
    element: document.getElementById("instructions"),
    name: "instructions",
    span: document.getElementById("ins-link")
};

tabs.push(instructions);

var works = {
    element: document.getElementById("works"),
    name: "works",
    span: document.getElementById("works-link")
};

tabs.push(works);

var why = {
    element: document.getElementById("why"),
    name: "why",
    span: document.getElementById("why-link")
};

tabs.push(why);

var reqst = {
    element: document.getElementById("reqst"),
    name: "reqst",
    span: document.getElementById("request-link")
};

tabs.push(reqst);

var del = {
    element: document.getElementById("delfile"),
    name: "delfile",
    span: document.getElementById("del-link")
};

tabs.push(del);

var ins_link = document.getElementById("ins-link");
var works_link = document.getElementById("works-link");
var why_link = document.getElementById("why-link");
var reqst_link = document.getElementById("request-link");

function show_tab(tab_name){
    console.log(this.name);
    modal.style.display = "block";
    for (t of tabs){
        console.log(t.name, tab_name);
        if (t.name != tab_name){
            t.element.style.display = "none";
        } else {
            t.element.style.display = "block";
        }
    }
}

for (var i = 0; i < tabs.length; i++){
    tabs[i].span.onclick = (function(name) {
        return function(){
            show_tab(name);
        }
    })(tabs[i].name)
}

function checkAnon(){
    var accessRow = document.querySelector("#accessrow");
    var anonYes = document.querySelector("#yes");
    var limitSpan = document.querySelector("#limit");

    if (anonYes.checked == false){
        accessRow.style.display = "table-row";
        limitSpan.innerHTML = "100";
        anon = false;
    } else {
        accessRow.style.display = "none";
        limitSpan.innerHTML = "10";
        anon = true;
    }
}

var delBtn = document.querySelector("#delbtn");
var delat = document.querySelector("#delat");
var delid = document.querySelector("#delid");

var ignoreClick = [delBtn, delat, delid];

modal.addEventListener('click', event => {
    if (ignoreClick.some(el => {
        return el == event.target
    })){
        //ignore
    } else {
        modal.style.display = "none";
    }
})

// modal.onclick = function(){
//     modal.style.display = "none";
// }

window.getQuota();
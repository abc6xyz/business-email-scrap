let xls_files = [];
let socket = new WebSocket("ws://localhost:8000/");

socket.onopen = function(e) {
  console.log("[open] Connection established");
  console.log("Sending to server");
};

socket.onmessage = function(event) {
  let data = JSON.parse(event.data);
  if (data['type'] == "apify") {

  }
  console.log(`[message] Data received from server: ${event.data}`);
};

socket.onclose = function(event) {
  if (event.wasClean) {
    console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.log('[close] Connection died');
  }
};

socket.onerror = function(error) {
  console.log(`[error]`);
};

document.addEventListener("click", function(e){
  let target = e.target.closest(".list-group-item > span");

  if(target){
    let li = target.closest('li');
    let nodes = Array.from(li.closest("ul").children);
    let index = nodes.indexOf(li);
    xls_files.splice(index, 1);
    console.log(xls_files);
    li.classList.add("removing");
    setTimeout(() => {
      li.remove();
    }, 500);
  }
});

document.getElementById('fileInput').onchange = function () {
  handleFiles(this.files);
};

$(function() {
  let dropArea = document.getElementById("dropContainer");
  
  dropArea.addEventListener("dragover", function(event) {
    event.preventDefault();
  });

  dropArea.addEventListener("dragenter", function(event) {
    event.preventDefault();
    dropArea.classList.add("drag-active");
  });

  dropArea.addEventListener("dragleave", function(event) {
    event.preventDefault();
    dropArea.classList.remove("drag-active");
  });

  dropArea.addEventListener("drop", function(event) {
    event.preventDefault();
    dropArea.classList.remove("drag-active");
    handleFiles(event.dataTransfer.files);
  });
});

function handleFiles(files) {
  for (let index = 0; index < files.length; index++) {
    let file = files[index];
    let item = "<li class='list-group-item'>"+file.name+"<span>&times;</span></li>";
    $(".list-group").append(item);
    xls_files.push(file);
  }
}

$("#start").click(function () {
  $(this).prop('disabled', true);
  for (let i = 0; i < xls_files.length; i++) {
    let xls_file = xls_files[i];
    let reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data = new Uint8Array(event.target.result);
        let workbook = XLSX.read(data, { type: 'array' });
        let sheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[sheetName];
        let json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
        console.log(json);
        $(".list-group li:nth-child("+(i+1)+") span").remove();
        let loading = '<div class="loading"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span><span class="spinner-text"></span></div>';
        $(".list-group li:nth-child("+(i+1)+")").append(loading);
  
        if(json.length != 0){
          let socket = new WebSocket("ws://localhost:8000/");
          socket.onopen = function(e) {
            console.log("[open] Connection established");
            console.log("Sending to server");
            // socket.send(JSON.stringify(json.map(row => row[4])));
          };
          socket.onmessage = function(event) {
            let data = JSON.parse(event.data);
            if (data['type'] == "apify") {
              $(".list-group li:nth-child("+(i+1)+") .spinner-text").text("   Loading...");
            }
            if (data['type'] == "requests") {
              let current = data["ref"]["status"][0];
              let total = data["ref"]["status"][1];
              json[current].append(data["ref"]["email"]);
              if (current+1 == total) {
                socket.close();
                const workbook = XLSX.utils.book_new();
                const worksheet = XLSX.utils.json_to_sheet(json);
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Tabelle1');
                XLSX.writeFile(workbook, xls_file.name+'_result.xlsx');
              } else {
                let percentage = (current / total) * 100;
                $(".list-group li:nth-child("+(i+1)+") .spinner-text").text(percentage.toFixed(2) + "%");
              }
            }
            console.log(`[message] Data received from server: ${data}`);
          };
        }
      } catch (error) {
        $(".list-group li:nth-child("+(i+1)+") div").text("not readable");
      }
    };
    reader.readAsArrayBuffer(xls_file);
  }
  this.prop('disabled', false);
})


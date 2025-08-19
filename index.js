document.getElementById("addRiderBtn").addEventListener("click", () => {  
  const riderDiv = document.createElement("div");  
  riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");  
  riderDiv.innerHTML = `  
    <label>Queued Time: <input type="text" placeholder="0:00 AM/PM" class="form-control queued"></label>  
    <label>Accepted Time: <input type="text" placeholder="0:00 AM/PM" class="form-control accepted"></label>  
    <label>Committed Pickup Time: <input type="text" placeholder="0:00 AM/PM" class="form-control committed"></label>  
    <label>Near Pickup Time: <input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup"></label>  
    <label>Picked Up Time: <input type="text" placeholder="0:00 AM/PM" class="form-control pickedup"></label>  
    <label>Est. Dropoff Departure: <input type="text" placeholder="0:00 AM/PM Estimated dropoff" class="form-control dropoff"></label>  
  `;  
  document.getElementById("ridersContainer").appendChild(riderDiv);  
  const vertical = document.getElementById("vertical").value;  
  const riders = document.querySelectorAll(".rider");  
  if (vertical === "NFV" && riders.length === 1 && !riderDiv.querySelector(".scheduled")) {  
    const scheduledInput = document.createElement("label");  
    scheduledInput.innerHTML = `Scheduled Time: <input type="text" placeholder="0:00 AM/PM" class="form-control scheduled">`;  
    riderDiv.insertBefore(scheduledInput, riderDiv.firstChild);  
  }  
});  
  
document.getElementById("calculateBtn").addEventListener("click", () => {  
  const vertical = document.getElementById("vertical").value;  
  const riders = document.querySelectorAll(".rider");  
  let totalDispatchingTime = 0;  
  let delays = [];  
  let cancellationReason = "";  
  let hasMultipleRiders = riders.length > 1;  
  let firstRiderIssue = false;  
  let timelineHTML = "<h5>Timeline:</h5>";  
  const currentTimeInput = document.getElementById("currentTime").value;  
  const riderReachable = document.getElementById("riderReachable").value;  
  
  // استخدم الأسماء الأصلية هنا لتبقى في الـ log
  let groupedDelays = {  
    "Dispatching Delay": 0,  
    "Rider Delay": 0,  
    "Preparation Delay": 0  
  };  
  
  riders.forEach((rider, index) => {  
    const queued = rider.querySelector(".queued").value;  
    const accepted = rider.querySelector(".accepted").value;  
    const committed = rider.querySelector(".committed").value;  
    const nearpickup = rider.querySelector(".nearpickup").value;  
    const pickedup = rider.querySelector(".pickedup").value;  
    const dropoff = rider.querySelector(".dropoff").value;  
  
    let scheduled = null;  
    if (vertical === "NFV" && index === 0) {  
      scheduled = rider.querySelector(".scheduled")?.value;  
    }  
  
    timelineHTML += `<div class="border rounded p-2 mb-2">  
      <strong>Rider ${index + 1}:</strong><br>`;  
    if (scheduled) timelineHTML += `Scheduled: ${scheduled}<br>`;  
    if (queued) timelineHTML += `Queued: ${queued}<br>`;  
    if (accepted) timelineHTML += `Accepted: ${accepted}<br>`;  
    if (committed) timelineHTML += `Committed Pickup: ${committed}<br>`;  
    if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup}<br>`;  
    if (pickedup) timelineHTML += `Picked Up: ${pickedup}<br>`;  
    if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff}<br>`;  
  
    if (queued && accepted) {  
      let dispatchTime = diffMinutes(queued, accepted);  
      if (vertical === "NFV" && scheduled) {  
        let prepTime = diffMinutes(scheduled, queued);  
        if (prepTime > 0) groupedDelays["Preparation Delay"] += prepTime;  
        let realDispatch = diffMinutes(queued, accepted);  
        groupedDelays["Dispatching Delay"] += realDispatch;  
      } else {  
        groupedDelays["Dispatching Delay"] += dispatchTime;  
      }  
      totalDispatchingTime += dispatchTime;  
    }  
  
    if (committed && pickedup) {  
      let d = diffMinutes(committed, pickedup);  
      delays.push(d);  
      groupedDelays["Rider Delay"] += d;  
    } else if (nearpickup && pickedup) {  
      let d = diffMinutes(nearpickup, pickedup);  
      delays.push(d);  
      groupedDelays["Rider Delay"] += d;  
    }  
  
    if (dropoff && pickedup) {  
      let driving = diffMinutes(pickedup, dropoff);  
      if (driving >= 0) timelineHTML += `<em>Driving Time: ${driving} mins</em><br>`;  
    }  
  
    if (pickedup && currentTimeInput) {  
      let currentDelay = diffMinutes(pickedup, currentTimeInput);  
      if (currentDelay > 0) {  
        delays.push(currentDelay);  
        groupedDelays["Rider Delay"] += currentDelay;  
      }  
    }  
  
    if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {  
      firstRiderIssue = true;  
      timelineHTML += `<strong style="color:red;">Issue detected with Rider 1</strong><br>`;  
    }  
  
    if (committed && nearpickup && currentTimeInput) {  
      let committedDelay = diffMinutes(committed, currentTimeInput);  
      if (committedDelay > 0 && !pickedup) {  
        groupedDelays["Preparation Delay"] += committedDelay;  
      }  
    }  
  
    if (index < riders.length - 1) {  
      let nextRider = riders[index + 1];  
      let nextQueued = nextRider.querySelector(".queued").value;  
      let lastTime = dropoff || pickedup || nearpickup || committed || accepted || queued;  
      if (lastTime && nextQueued) {  
        let gap = diffMinutes(lastTime, nextQueued);  
        if (gap > 0) {  
          groupedDelays["Rider Delay"] += gap;  
          timelineHTML += `<em style="color:orange;">Gap until Rider ${index + 2} queued: ${gap} mins</em><br>`;  
        }  
      }  
    }  
  
    timelineHTML += `</div>`;  
  });  
  
  // تحويل الأسماء لملخص النتائج
  const delayMapping = {  
    "Dispatching Delay": "Lack of Delivery Men",  
    "Rider Delay": "Late Delivery",  
    "Preparation Delay": "Preparation Delay"  
  };  
  
  let biggestDelayType = "";  
  let biggestDelayValue = 0;  
  Object.keys(groupedDelays).forEach(type => {  
    if (groupedDelays[type] > biggestDelayValue) {  
      biggestDelayValue = groupedDelays[type];  
      biggestDelayType = type;  
    }  
  });  
  
  let resultHTML = timelineHTML;  
  resultHTML += `<h5>Summary:</h5>`;  
  Object.keys(groupedDelays).forEach(type => {  
    if (groupedDelays[type] > 0) {  
      resultHTML += `<p style="${biggestDelayType === type ? 'color:red; font-weight:bold;' : ''}">  
        ${delayMapping[type]}: ${groupedDelays[type]} mins  
      </p>`;  
    }  
  });  
  
  if (biggestDelayType) {  
    resultHTML += `<p><strong>Biggest Delay:</strong> ${delayMapping[biggestDelayType]} = ${biggestDelayValue} mins</p>`;  
  }  
  
  if (riderReachable === "no" && biggestDelayType === "Rider Delay") {  
    cancellationReason = "Rider Unreachable";  
  } else if (hasMultipleRiders && firstRiderIssue) {  
    cancellationReason = "Order picked up/delivered by another rider";  
  } else {  
    cancellationReason = delayMapping[biggestDelayType] || "Preparation Delay";  
  }  
  
  resultHTML += `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>`;  
  document.getElementById("result").innerHTML = resultHTML;  
});  
  
function parseTime(timeStr) {  
  if (!timeStr) return null;  
  let parts = timeStr.trim().split(" ");  
  let timePart = parts[0];  
  let ampm = parts[1] ? parts[1].toUpperCase() : null;  
  let [h, m, s] = timePart.split(":").map(Number);  
  if (isNaN(s)) s = 0;  
  if (ampm === "PM" && h < 12) h += 12;  
  if (ampm === "AM" && h === 12) h = 0;  
  return h * 60 + m + (s / 60);  
}  
  
function diffMinutes(start, end) {  
  let startMinutes = parseTime(start);  
  let endMinutes = parseTime(end);  
  if (startMinutes == null || endMinutes == null) return 0;  
  if (endMinutes < startMinutes) endMinutes += 24 * 60;  
  return Math.round(endMinutes - startMinutes);  
}
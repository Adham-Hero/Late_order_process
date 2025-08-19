document.getElementById("addRiderBtn").addEventListener("click", () => {
  const riderDiv = document.createElement("div");
  riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");
  riderDiv.innerHTML = `
    <label>Queued Time: <input type="text" placeholder="0:00 AM/PM" class="form-control queued"></label>
    <label>Accepted Time: <input type="text" placeholder="0:00 AM/PM" class="form-control accepted"></label>
    <label>Committed Pickup Time: <input type="text" placeholder="00:00 AM/PM" class="form-control committed"></label>
    <label>Near Pickup Time: <input type="text" placeholder="0:00 AM/PM" class="form-control nearpickup"></label>
    <label>Picked Up Time: <input type="text" placeholder="0:00 AM/PM" class="form-control pickedup"></label>
    <label>Est. Dropoff Departure: <input type="text" placeholder="00:00 AM/PM Estimated dropoff" class="form-control dropoff"></label>
  `;
  document.getElementById("ridersContainer").appendChild(riderDiv);
});

document.getElementById("calculateBtn").addEventListener("click", () => {
  const riders = document.querySelectorAll(".rider");
  let totalDispatchingTime = 0;
  let delays = [];
  let cancellationReason = "";
  let hasMultipleRiders = riders.length > 1;
  let firstRiderIssue = false;
  let timelineHTML = "<h5>Timeline:</h5>";
  const currentTimeInput = document.getElementById("currentTime").value;

  riders.forEach((rider, index) => {
    const queued = rider.querySelector(".queued").value;
    const accepted = rider.querySelector(".accepted").value;
    const committed = rider.querySelector(".committed").value;
    const nearpickup = rider.querySelector(".nearpickup").value;
    const pickedup = rider.querySelector(".pickedup").value;
    const dropoff = rider.querySelector(".dropoff").value;

    timelineHTML += `<div class="border rounded p-2 mb-2">
      <strong>Rider ${index + 1}:</strong><br>`;
    if (queued) timelineHTML += `Queued: ${queued}<br>`;
    if (accepted) timelineHTML += `Accepted: ${accepted}<br>`;
    if (committed) timelineHTML += `Committed Pickup: ${committed}<br>`;
    if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup}<br>`;
    if (pickedup) timelineHTML += `Picked Up: ${pickedup}<br>`;
    if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff}<br>`;

    if (queued && accepted) {
      let dispatchTime = diffMinutes(queued, accepted);
      totalDispatchingTime += dispatchTime;
      timelineHTML += `<em>Dispatching Time: ${dispatchTime} mins</em><br>`;
    }

    if (committed && pickedup) {
      let d = diffMinutes(committed, pickedup);
      delays.push(d);
      timelineHTML += `<em>Delay (Committed → Picked Up): ${d} mins</em><br>`;
    } else if (nearpickup && pickedup) {
      let d = diffMinutes(nearpickup, pickedup);
      delays.push(d);
      timelineHTML += `<em>Delay (Near Pickup → Picked Up): ${d} mins</em><br>`;
    }

    if (dropoff && pickedup) {
      let driving = diffMinutes(pickedup, dropoff);
      if (driving >= 0) timelineHTML += `<em>Driving Time: ${driving} mins</em><br>`;
    }

    if (pickedup && currentTimeInput) {
      let currentDelay = diffMinutes(pickedup, currentTimeInput);
      if (currentDelay > 0) {
        delays.push(currentDelay);
        timelineHTML += `<em>Current Delay (Picked Up → Now): ${currentDelay} mins</em><br>`;
      } else {
        timelineHTML += `<em>No Delay after pickup yet</em><br>`;
      }
    }

    if (index === 0 && ((accepted && !pickedup) || (queued && !accepted))) {
      firstRiderIssue = true;
      timelineHTML += `<strong style="color:red;">Issue detected with Rider 1</strong><br>`;
    }

    timelineHTML += `</div>`;
  });

  let riderReachable = document.getElementById("riderReachable").value;
  let maxDelay = Math.max(totalDispatchingTime, ...(delays.length ? delays : [0]));

  if (hasMultipleRiders && firstRiderIssue) cancellationReason = "Order picked up/delivered by another rider";
  else if (maxDelay === totalDispatchingTime && totalDispatchingTime > 0) cancellationReason = "Lack of Delivery Men";
  else if (riderReachable === "yes" && delays.length > 0) cancellationReason = "Late Delivery";
  else if (riderReachable === "no") cancellationReason = "Rider Unreachable";
  else cancellationReason = "Preparation Delay";

  let lastRider = riders[riders.length - 1];
  let lastStateIsNearPickup = lastRider.querySelector(".nearpickup").value && !lastRider.querySelector(".pickedup").value;
  let committedTime = lastRider.querySelector(".committed").value;

  let toggleAllowed = false;
  if (lastStateIsNearPickup && committedTime && currentTimeInput) {
    let committedDelay = diffMinutes(committedTime, currentTimeInput);
    if (committedDelay > 0) {
      cancellationReason = "Preparation Delay";
      toggleAllowed = true;
    }
  }

  let resultHTML = timelineHTML;
  resultHTML += `<h5>Summary:</h5>`;
  if (totalDispatchingTime > 0) resultHTML += `<p>Total Dispatching Time: ${totalDispatchingTime} mins</p>`;
  if (delays.length > 0) resultHTML += `<p>Delays: ${delays.join(", ")} mins</p>`;
  resultHTML += `<p><strong>Cancellation Reason:</strong> <span id="reasonText">${cancellationReason}</span></p>`;

  if (toggleAllowed) {
    resultHTML += `<button id="toggleReasonBtn" class="btn btn-warning btn-sm mt-2">Toggle Reason</button>`;
  }

  document.getElementById("result").innerHTML = resultHTML;

  const toggleBtn = document.getElementById("toggleReasonBtn");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      let reasonSpan = document.getElementById("reasonText");
      if (reasonSpan.innerText === "Preparation Delay") {
        reasonSpan.innerText = "Late Delivery";
      } else {
        reasonSpan.innerText = "Preparation Delay";
      }
    });
  }
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
document.getElementById("addRiderBtn").addEventListener("click", () => {
  const riderDiv = document.createElement("div");
  riderDiv.classList.add("rider", "border", "rounded", "p-3", "mb-2");
  riderDiv.innerHTML = `
    <label>Queued Time: <input type="time" class="form-control queued"></label>
    <label>Accepted Time: <input type="time" class="form-control accepted"></label>
    <label>Committed Pickup Time: <input type="time" class="form-control committed"></label>
    <label>Near Pickup Time: <input type="time" class="form-control nearpickup"></label>
    <label>Picked Up Time: <input type="time" class="form-control pickedup"></label>
    <label>Est. Dropoff Departure: <input type="time" class="form-control dropoff"></label>
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
      let dropoffDelay = diffMinutes(pickedup, dropoff);
      if (dropoffDelay > 0) {
        delays.push(dropoffDelay);
        timelineHTML += `<em>Dropoff Delay: ${dropoffDelay} mins</em><br>`;
      } else {
        timelineHTML += `<em>Driving Time: ${Math.abs(dropoffDelay)} mins</em><br>`;
      }
    } else if (dropoff && currentTimeInput) {
      let diffNow = diffMinutes(dropoff, currentTimeInput);
      if (diffNow < 0) {
        delays.push(Math.abs(diffNow));
        timelineHTML += `<em>Current Dropoff Delay: ${Math.abs(diffNow)} mins (order cancelled before delivery)</em><br>`;
      } else {
        timelineHTML += `<em>No Dropoff Delay yet (current time before Est. Dropoff)</em><br>`;
      }
    }

    if (index === 0) {
      if ((accepted && !pickedup) || (queued && !accepted)) {
        firstRiderIssue = true;
        timelineHTML += `<strong style="color:red;">Issue detected with Rider 1</strong><br>`;
      }
    }

    timelineHTML += `</div>`;
  });

  let riderReachable = document.getElementById("riderReachable").value;
  let maxDelay = Math.max(totalDispatchingTime, ...(delays.length ? delays : [0]));

  if (hasMultipleRiders && firstRiderIssue) {
    cancellationReason = "Order picked up/delivered by another rider";
  } else if (maxDelay === totalDispatchingTime && totalDispatchingTime > 0) {
    cancellationReason = "Lack of Delivery Men";
  } else if (riderReachable === "yes" && delays.length > 0) {
    cancellationReason = "Late Delivery";
  } else if (riderReachable === "no") {
    cancellationReason = "Rider Unreachable";
  } else {
    cancellationReason = "Preparation Delay";
  }

  let resultHTML = timelineHTML;
  resultHTML += `<h5>Summary:</h5>`;
  if (totalDispatchingTime > 0) {
    resultHTML += `<p>Total Dispatching Time: ${totalDispatchingTime} mins</p>`;
  }
  if (delays.length > 0) {
    resultHTML += `<p>Delays: ${delays.join(", ")} mins</p>`;
  }
  resultHTML += `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>`;

  document.getElementById("result").innerHTML = resultHTML;
});

function diffMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}
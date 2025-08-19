document.getElementById("calculateBtn").addEventListener("click", () => {
  const riders = document.querySelectorAll(".rider");
  let totalDispatchingTime = 0;
  let delays = [];
  let cancellationReason = "";
  let hasMultipleRiders = riders.length > 1;
  let firstRiderIssue = false;
  let timelineHTML = "<h5>Timeline:</h5>";
  const currentTimeInput = document.getElementById("currentTime").value;

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
      groupedDelays["Dispatching Delay"] += dispatchTime;
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

    timelineHTML += `</div>`;
  });

  // biggest delay
  let biggestDelayType = "";
  let biggestDelayValue = 0;
  Object.keys(groupedDelays).forEach(type => {
    if (groupedDelays[type] > biggestDelayValue) {
      biggestDelayValue = groupedDelays[type];
      biggestDelayType = type;
    }
  });

  // check if rider unreachable
  const riderReachable = document.getElementById("riderReachable").value;
  if (riderReachable === "no") {
    cancellationReason = "Rider Unreachable";
  } else {
    if (hasMultipleRiders && firstRiderIssue) {
      cancellationReason = "Order picked up/delivered by another rider";
    } else {
      cancellationReason = biggestDelayType || "Preparation Delay";
    }
  }

  let resultHTML = timelineHTML;
  resultHTML += `<h5>Summary:</h5>`;
  Object.keys(groupedDelays).forEach(type => {
    if (groupedDelays[type] > 0) {
      resultHTML += `<p style="${biggestDelayType === type ? 'color:red; font-weight:bold;' : ''}">
        ${type}: ${groupedDelays[type]} mins
      </p>`;
    }
  });

  if (biggestDelayType) {
    resultHTML += `<p><strong>Biggest Delay:</strong> ${biggestDelayType} = ${biggestDelayValue} mins</p>`;
  }
  resultHTML += `<p><strong>Cancellation Reason:</strong> ${cancellationReason}</p>`;

  document.getElementById("result").innerHTML = resultHTML;
});
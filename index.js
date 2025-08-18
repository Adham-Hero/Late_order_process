document.getElementById("calculateBtn").addEventListener("click", () => {
  const riders = document.querySelectorAll(".rider");
  let totalDispatchingTime = 0;
  let delays = [];
  let cancellationReason = "";

  let hasMultipleRiders = riders.length > 1;
  let firstRiderIssue = false;

  let timelineHTML = "<h5>Timeline:</h5>";

  riders.forEach((rider, index) => {
    const queued = rider.querySelector(".queued").value;
    const accepted = rider.querySelector(".accepted").value;
    const committed = rider.querySelector(".committed").value;
    const nearpickup = rider.querySelector(".nearpickup").value;
    const pickedup = rider.querySelector(".pickedup").value;
    const dropoff = rider.querySelector(".dropoff").value;

    timelineHTML += `<div class="border rounded p-2 mb-2">
      <strong>Rider ${index + 1}:</strong><br>`;

    // Show only existing stages
    if (queued) timelineHTML += `Queued: ${queued}<br>`;
    if (accepted) timelineHTML += `Accepted: ${accepted}<br>`;
    if (committed) timelineHTML += `Committed Pickup: ${committed}<br>`;
    if (nearpickup) timelineHTML += `Near Pickup: ${nearpickup}<br>`;
    if (pickedup) timelineHTML += `Picked Up: ${pickedup}<br>`;
    if (dropoff) timelineHTML += `Est. Dropoff Departure: ${dropoff}<br>`;

    // Dispatching Time
    if (queued && accepted) {
      let dispatchTime = diffMinutes(queued, accepted);
      totalDispatchingTime += dispatchTime;
      timelineHTML += `<em>Dispatching Time: ${dispatchTime} mins</em><br>`;
    }

    // Delay logic
    if (committed && pickedup) {
      let d = diffMinutes(committed, pickedup);
      delays.push(d);
      timelineHTML += `<em>Delay (Committed → Picked Up): ${d} mins</em><br>`;
    } else if (nearpickup && pickedup) {
      let d = diffMinutes(nearpickup, pickedup);
      delays.push(d);
      timelineHTML += `<em>Delay (Near Pickup → Picked Up): ${d} mins</em><br>`;
    }

    // Dropoff Delay
    if (dropoff && pickedup) {
      let dropoffDelay = diffMinutes(pickedup, dropoff);
      if (dropoffDelay > 0) {
        delays.push(dropoffDelay);
        timelineHTML += `<em>Dropoff Delay: ${dropoffDelay} mins</em><br>`;
      }
    }

    // Detect issue with first rider
    if (index === 0) {
      if ((accepted && !pickedup) || (queued && !accepted)) {
        firstRiderIssue = true;
        timelineHTML += `<strong style="color:red;">Issue detected with Rider 1</strong><br>`;
      }
    }

    timelineHTML += `</div>`;
  });

  // Cancellation Reason
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

  // Results HTML
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
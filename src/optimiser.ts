import {
  Optimiser,
  Evaluator,
  ISubject,
  IAllocation,
  IPreferences,
} from "./structures";

export function generateStreamCombinations(subject: ISubject): number[][] {
  let streamCombinations: number[][][] = [[], [[]]];
  let index = 0;
  let otherIndex = (index + 1) % 2;

  let numActivityGroups = subject.activity_group_list.length;

  // if there are no activity groups there are no stream combinations
  if (!numActivityGroups) {
    return streamCombinations[index];
  }

  // iterate across all subjects

  for (let i = 0; i < subject.activity_group_list.length; i++) {
    // For each stream combination of previous subjects add a new combination
    // for each stream in the new activity group

    while (streamCombinations[otherIndex].length > 0) {
      let subject_group = subject.activity_group_list[i];

      // if there are no streams for this activity group then there are
      // no possible combinations

      if (!subject_group.stream_list.length) {
        return [];
      }

      let base = streamCombinations[otherIndex].pop();

      for (let j = 0; j < subject_group.stream_list.length; j++) {
        base.push(j);
        streamCombinations[index].push(base.slice());
        base.pop();
      }
    }

    index = otherIndex;
    otherIndex = (otherIndex + 1) % 2;
  }

  return streamCombinations[otherIndex];
}

export function generateAllocations(subjects: ISubject[]): IAllocation[] {
  let allocations: IAllocation[] = [];
  let numSubjects = subjects.length;

  let allocationList: number[][][][] = [[], [[]]];
  let index = 0;
  let otherIndex = (index + 1) % 2;

  // if there are no subjects then there are no allocations
  if (!numSubjects) {
    return allocations;
  }

  for (let i = 0; i < numSubjects; i++) {
    let subject = subjects[i];

    let streams = generateStreamCombinations(subject);

    // if there are no stream combinations for this subject, then
    // there are to allocations

    if (!streams.length) {
      return [];
    }

    // for allocation of previous subjects add a new allocation with all
    // stream combinations of this subject

    while (allocationList[otherIndex].length > 0) {
      let allocation = allocationList[otherIndex].pop();

      for (let j = 0; j < streams.length; j++) {
        allocation.push(streams[j]);

        allocationList[index].push(allocation.slice());
        allocation.pop();
      }
    }

    index = otherIndex;
    otherIndex = (otherIndex + 1) % 2;
  }

  // create allocations

  for (let allocation of allocationList[otherIndex]) {
    allocations.push({ allocation: allocation });
  }

  return allocations;
}

// implementation of Fisher-Yates Shuffle

export function shuffle(
  allocations: IAllocation[],
  size?: number
): IAllocation[] {
  let length = allocations.length;

  let items = length;

  if (typeof size !== "undefined" && size > -1) {
    items = Math.min(size, length);
  }

  for (let i = length - 1; i >= length - items; i--) {
    let j = Math.floor(Math.random() * (i + 1));

    let temp = allocations[j];
    allocations[j] = allocations[i];
    allocations[i] = temp;
  }

  return allocations.slice(length - items, length);
}

//

export function optimise(
  subjects: ISubject[],
  preferences: IPreferences,
  evaluation: Evaluator,
  algorithm: Optimiser
): IAllocation[] {
  // make a modification to ISubject to match the required format
  const subjects_modif = JSON.parse(JSON.stringify(subjects)) as any;
  for (let subj of subjects_modif) {
    for (let act_group of subj.activity_group_list) {
      for (let stream of act_group.stream_list) {
        for (let activity of stream.activity_list) {
          const t_start = activity.times.start.split(":").map(x => parseInt(x, 10));
          const t_end = activity.times.end.split(":").map(x => parseInt(x, 10));

          activity.times.start = { hour: t_start[0], minute: t_start[1] };
          activity.times.end = { hour: t_end[0], minute: t_end[1] };
        }
      }
    }
  }

  const allocationCutoff = 10000;

  let allocations = generateAllocations(subjects);

  // if there are more allocations than the given cutoff then take
  // a random subject of size allocationCutoff
  if (allocations.length > allocationCutoff) {
    allocations = shuffle(allocations, allocationCutoff);
  }

  // sort and return

  let sortedAllocations = algorithm(
    allocations,
    subjects_modif,
    preferences,
    evaluation
  );

  return sortedAllocations;
}

// Idea is that first we map each allocation to the pair of the allocation and it's score. Then we sort these pairs based on the
// scores. Then we map the sorted array back to just allocations.

export function sortOptimsation(
  allocations: IAllocation[],
  subjects: ISubject[],
  preferences: IPreferences,
  evaluation: Evaluator
): IAllocation[] {
  let pairs = allocations.map((x) =>
    pair(x, subjects, preferences, evaluation)
  );

  pairs.sort((a, b) => a[1] - b[1]);
  console.log("Sorted");

  let sortedAllocations = pairs.map((a) => ({ ...a[0], score: a[1] }));
  sortedAllocations.reverse();

  return sortedAllocations;
}

function pair(
  allocation: IAllocation,
  subjects: ISubject[],
  preferences: IPreferences,
  evaluation: Evaluator
): [IAllocation, number] {
  return [allocation, evaluation(subjects, allocation, preferences)];
}

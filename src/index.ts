import { Class, Subject, Timetable, Day, ClassType } from "./structures";

console.log("Hello world!")

let subjects: Subject[] = [
  {
    name: "Subject1",
    classes: {
      "Tutorial1": [
        {
          start: [14, 0],
          end: [15, 0],
          day: Day.Mon,
          type: ClassType.Tutorial,
          name: "Tutorial1.1"
        },
        {
          start: [14, 0],
          end: [15, 0],
          day: Day.Mon,
          type: ClassType.Tutorial,
          name: "Tutorial1.2"
        }
      ],
      "Tutorial2": [
        {
          start: [14, 0],
          end: [15, 0],
          day: Day.Wed,
          type: ClassType.Tutorial,
          name: "Tutorial2.1"
        },
        {
          start: [18, 0],
          end: [19, 0],
          day: Day.Wed,
          type: ClassType.Tutorial,
          name: "Tutorial2.2"
        }
      ]
    }
  }
];

let classes: Class[] = [subjects[0].classes["Tutorial1"][0]];



let t = new Timetable(classes, subjects);
console.log(t);

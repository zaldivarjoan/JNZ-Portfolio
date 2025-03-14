// export const textVariant = (delay) => ({
//   hidden: { y: -50, opacity: 0 },
//   show: {
//     y: 0,
//     opacity: 1,
//     transition: {
//       type: "spring",
//       duration: 1.25,
//       delay,
//     },
//   },
// });

// export const fadeIn = (direction, type, delay, duration) => {
//   const x = direction === "left" ? 100 : direction === "right" ? -100 : 0;
//   const y = direction === "up" ? 100 : direction === "down" ? -100 : 0;

//   return {
//     hidden: { x, y, opacity: 0 },
//     show: {
//       x: 0,
//       y: 0,
//       opacity: 1,
//       transition: {
//         type,
//         delay,
//         duration,
//         ease: "easeOut",
//       },
//     },
//   };
// };

// export const zoomIn = (delay, duration) => ({
//   hidden: { scale: 0, opacity: 0 },
//   show: {
//     scale: 1,
//     opacity: 1,
//     transition: {
//       type: "tween",
//       delay,
//       duration,
//       ease: "easeOut",
//     },
//   },
// });

// export const slideIn = (direction, type, delay, duration) => {
//   const x = direction === "left" ? "-100%" : direction === "right" ? "100%" : 0;
//   const y = direction === "up" ? "100%" : direction === "down" ? "100%" : 0;

//   return {
//     hidden: { x, y },
//     show: {
//       x: 0,
//       y: 0,
//       transition: {
//         type,
//         delay,
//         duration,
//         ease: "easeOut",
//       },
//     },
//   };
// };

// export const staggerContainer = (staggerChildren, delayChildren) => ({
//   hidden: {},
//   show: {
//     transition: {
//       staggerChildren,
//       delayChildren: delayChildren || 0,
//     },
//   },
// });
const defaultTransition = (type, delay, duration) => ({
  type,
  delay,
  duration,
  ease: "easeOut",
});

export const textVariant = (delay = 0) => ({
  hidden: { y: -50, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: defaultTransition("spring", delay, 1.25),
  },
});

export const fadeIn = (direction = "up", type = "tween", delay = 0, duration = 0.75) => {
  const offsets = { left: [100, 0], right: [-100, 0], up: [0, 100], down: [0, -100] };
  const [x, y] = offsets[direction] || [0, 0];

  return {
    hidden: { x, y, opacity: 0 },
    show: { x: 0, y: 0, opacity: 1, transition: defaultTransition(type, delay, duration) },
  };
};

export const zoomIn = (delay = 0, duration = 0.75) => ({
  hidden: { scale: 0, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: defaultTransition("tween", delay, duration) },
});

export const slideIn = (direction = "left", type = "tween", delay = 0, duration = 0.75) => {
  const offsets = { left: ["-100%", 0], right: ["100%", 0], up: [0, "100%"], down: [0, "-100%"] };
  const [x, y] = offsets[direction] || [0, 0];

  return {
    hidden: { x, y },
    show: { x: 0, y: 0, transition: defaultTransition(type, delay, duration) },
  };
};

export const staggerContainer = (staggerChildren = 0.25, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

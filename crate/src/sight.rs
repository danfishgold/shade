extern crate web_sys;

use std::collections::HashSet;
use std::hash::{Hash, Hasher};

// macro_rules! log {
//     ( $( $t:tt )* ) => {
//         web_sys::console::log_1(&format!( $( $t )* ).into());
//     }
// }

#[derive(Debug, Copy, Clone)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

impl PartialEq for Point {
    fn eq(&self, other: &Self) -> bool {
        self.x == other.x
    }
}

impl Eq for Point {}

impl Hash for Point {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.x.to_ne_bytes().hash(state);
        self.y.to_ne_bytes().hash(state);
    }
}

pub struct Segment {
    pub a: Point,
    pub b: Point,
}

#[derive(Debug, Copy, Clone)]
struct Intersection {
    x: f64,
    y: f64,
    param: f64,
}

pub struct Sight {
    inner_segments: Vec<Segment>,
    border_segments: Vec<Segment>,
    unique_inner_points: Vec<Point>,
    unique_border_points: Vec<Point>,
}

impl Sight {
    pub fn new(inner_segments: Vec<Segment>, border_segments: Vec<Segment>) -> Sight {
        let inner_points = unique_points_from_segments(&inner_segments);
        let border_points = unique_points_from_segments(&border_segments);
        Sight {
            inner_segments: inner_segments,
            border_segments: border_segments,
            unique_inner_points: inner_points,
            unique_border_points: border_points,
        }
    }

    pub fn sight_polygon(&self, source: Point) -> Vec<Point> {
        let angles = self
            .unique_inner_points
            .iter()
            .chain(self.unique_border_points.iter())
            .flat_map(|pt: &Point| {
                let angle = f64::atan2(pt.y - source.y, pt.x - source.x);
                vec![angle - 0.00001, angle + 0.00001]
            });

        let mut angled_intersects: Vec<(Intersection, f64)> = vec![];
        for angle in angles {
            let dx = f64::cos(angle);
            let dy = f64::sin(angle);

            let ray = Segment {
                a: source,
                b: Point {
                    x: source.x + dx,
                    y: source.y + dy,
                },
            };

            if let Some(intersect) = closest_intersect(
                self.inner_segments
                    .iter()
                    .chain(self.border_segments.iter()),
                &ray,
            ) {
                angled_intersects.push((intersect, angle))
            }
        }

        angled_intersects.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        angled_intersects
            .iter()
            .map(|a| Point { x: a.0.x, y: a.0.y })
            .collect()
    }

    pub fn isometric_sight(&self, angle: f64) -> Vec<Point> {
        let dx = f64::cos(angle);
        let dy = f64::sin(angle);
        // normal
        let n = Point { x: dy, y: -dx };

        let sources = self
            .unique_inner_points
            .iter()
            .chain(self.unique_border_points.iter())
            .flat_map(|pt: &Point| {
                vec![
                    Point {
                        x: pt.x + 0.0001 * n.x,
                        y: pt.y + 0.0001 * n.y,
                    },
                    Point {
                        x: pt.x - 0.0001 * n.x,
                        y: pt.y - 0.0001 * n.y,
                    },
                ]
            });

        let mut projected_intersects: Vec<(Intersection, f64)> = vec![];
        for source in sources {
            let ray = Segment {
                a: source,
                b: Point {
                    x: source.x + dx,
                    y: source.y + dy,
                },
            };

            if let Some(intersect) = closest_intersect(
                self.inner_segments
                    .iter()
                    .chain(self.border_segments.iter()),
                &ray,
            ) {
                projected_intersects.push((intersect, n.x * intersect.x + n.y * intersect.y))
            }
        }

        projected_intersects.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        projected_intersects
            .iter()
            .map(|a| Point { x: a.0.x, y: a.0.y })
            .collect()
    }
}

fn get_intersection(ray: &Segment, segment: &Segment) -> Option<Intersection> {
    // RAY in parametric: Point + Delta*t1
    let r_px = ray.a.x;
    let r_py = ray.a.y;
    let r_dx = ray.b.x - ray.a.x;
    let r_dy = ray.b.y - ray.a.y;

    // SEGMENT in parametric: Point + Delta*t2
    let s_px = segment.a.x;
    let s_py = segment.a.y;
    let s_dx = segment.b.x - segment.a.x;
    let s_dy = segment.b.y - segment.a.y;

    // Are they parallel? If so, no intersect
    let r_mag = (r_dx * r_dx + r_dy * r_dy).sqrt();
    let s_mag = (s_dx * s_dx + s_dy * s_dy).sqrt();
    if r_dx / r_mag == s_dx / s_mag && r_dy / r_mag == s_dy / s_mag {
        // Unit vectors are the same.
        return None;
    }

    // SOLVE FOR t1 & t2
    // r_px+r_dx*t1 = s_px+s_dx*t2 && r_py+r_dy*t1 = s_py+s_dy*t2
    // ==> t1 = (s_px+s_dx*t2-r_px)/r_dx = (s_py+s_dy*t2-r_py)/r_dy
    // ==> s_px*r_dy + s_dx*t2*r_dy - r_px*r_dy = s_py*r_dx + s_dy*t2*r_dx - r_py*r_dx
    // ==> t2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx)
    let t2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
    let t1 = (s_px + s_dx * t2 - r_px) / r_dx;

    // Must be within parametic whatevers for RAY/SEGMENT
    if t1 < 0.0 {
        return None;
    }
    if t2 < 0.0 || t2 > 1.0 {
        return None;
    }

    // Return the POINT OF INTERSECTION
    return Some(Intersection {
        x: r_px + r_dx * t1,
        y: r_py + r_dy * t1,
        param: t1,
    });
}

fn unique_points_from_segments(segments: &Vec<Segment>) -> Vec<Point> {
    let mut point_set = HashSet::new();
    for segment in segments {
        point_set.insert(segment.a.clone());
        point_set.insert(segment.b.clone());
    }
    return point_set.into_iter().collect();
}

fn closest_intersect<'a, Iter>(segments: Iter, ray: &Segment) -> Option<Intersection>
where
    Iter: Iterator<Item = &'a Segment>,
{
    let mut closest: Option<Intersection> = None;
    for segment in segments {
        if let Some(intersect) = get_intersection(ray, segment) {
            if let Some(closest_int) = &closest {
                if intersect.param < closest_int.param {
                    closest = Some(intersect);
                }
            } else {
                closest = Some(intersect);
            }
        }
    }
    closest
}

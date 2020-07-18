use std::collections::HashSet;
use std::hash::{Hash, Hasher};

#[derive(Debug, Copy, Clone)]
pub struct Point {
    x: f64,
    y: f64,
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
    a: Point,
    b: Point,
}

struct Intersection {
    x: f64,
    y: f64,
    param: f64,
}

pub struct Sight {
    segments: Vec<Segment>,
    unique_points: Vec<Point>,
}

impl Sight {
    pub fn new(segments: Vec<Segment>) -> Sight {
        let points = unique_points_from_segments(&segments);
        Sight {
            segments: segments,
            unique_points: points,
        }
    }

    pub fn sight_polygon(&self, source: Point) -> Vec<Point> {
        let unique_angles = (&self.unique_points).iter().flat_map(|pt: &Point| {
            let angle = f64::atan2(pt.y - source.y, pt.x - source.x);
            vec![angle - 0.00001, angle + 0.00001]
        });

        let mut angled_intersects: Vec<(Intersection, f64)> = vec![];
        for angle in unique_angles {
            let dx = f64::cos(angle);
            let dy = f64::sin(angle);

            let ray = Segment {
                a: source,
                b: Point {
                    x: source.x + dx,
                    y: source.y + dy,
                },
            };

            if let Some(intersect) = closest_intersect(&self.segments, &ray) {
                angled_intersects.push((intersect, angle))
            }
        }

        angled_intersects.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        angled_intersects
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
    for segment in segments.iter() {
        point_set.insert(segment.a.clone());
        point_set.insert(segment.b.clone());
    }
    return point_set.into_iter().collect();
}

fn closest_intersect(segments: &Vec<Segment>, ray: &Segment) -> Option<Intersection> {
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

fn main() {
    let sight = Sight::new(vec![
        Segment {
            a: Point { x: 0.0, y: 0.0 },
            b: Point { x: 1.0, y: 0.0 },
        },
        Segment {
            a: Point { x: 1.0, y: 1.0 },
            b: Point { x: 1.0, y: 0.0 },
        },
        Segment {
            a: Point { x: 0.0, y: 1.0 },
            b: Point { x: 1.0, y: 1.0 },
        },
        Segment {
            a: Point { x: 0.0, y: 0.0 },
            b: Point { x: 0.0, y: 1.0 },
        },
    ]);

    let polygon = sight.sight_polygon(Point { x: 0.5, y: 0.5 });
    println!("{:?}", polygon.len());
}
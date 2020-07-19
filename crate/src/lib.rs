#[macro_use]
extern crate cfg_if;
extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

mod sight;

cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function to get better error messages if we ever panic.
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        use console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
        fn set_panic_hook() {}
    }
}

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[wasm_bindgen]
pub struct WasmSight {
    sight: Option<sight::Sight>,
    polygon_components: Vec<f64>,
    segment_components: Vec<f64>,
}

#[wasm_bindgen]
impl WasmSight {
    /*
    order of operations:

    1. initialize (WasmSight::new)
    2. get the pointer to segment components (WasmSight::segment_components)
    3. fill it with segments (a.x, a.y, b.x, b.y)
    4. WasmSight::initialize_sight, passing in the number of segments
    5. WasmSight::generate_polygon, passing in the source (source.x, source.y)
    6. check WasmSight::polygon_size to know how big the array should be
    7. get the pointer to the array of polygon points with WasmSight::polygon
    */

    pub fn new() -> WasmSight {
        set_panic_hook();
        WasmSight {
            sight: None,
            polygon_components: vec![],
            segment_components: vec![],
        }
    }

    pub fn segment_components(&mut self) -> *mut f64 {
        self.segment_components.as_mut_ptr()
    }

    pub fn initialize_sight(&mut self, segment_count: usize) {
        unsafe {
            self.segment_components = Vec::from_raw_parts(
                self.segment_components.as_mut_ptr(),
                segment_count * 4,
                segment_count * 4,
            );
        }
        let mut segments = vec![];
        for segment_index in 0..segment_count {
            segments.push(sight::Segment {
                a: sight::Point {
                    x: self.segment_components[segment_index * 4 + 0],
                    y: self.segment_components[segment_index * 4 + 1],
                },
                b: sight::Point {
                    x: self.segment_components[segment_index * 4 + 2],
                    y: self.segment_components[segment_index * 4 + 3],
                },
            })
        }
        self.sight = Some(sight::Sight::new(segments));
    }

    pub fn generate_polygon(&mut self, source_x: f64, source_y: f64) {
        if let Some(sight) = &self.sight {
            let source = sight::Point {
                x: source_x,
                y: source_y,
            };
            let polygon = sight.sight_polygon(source);
            self.polygon_components = polygon.iter().flat_map(|pt| vec![pt.x, pt.y]).collect()
        }
    }

    pub fn generate_isometric_polygon(&mut self, angle: f64) {
        if let Some(sight) = &self.sight {
            let polygon = sight.isometric_sight(angle);
            self.polygon_components = polygon.iter().flat_map(|pt| vec![pt.x, pt.y]).collect()
        }
    }

    pub fn polygon(&self) -> *const f64 {
        self.polygon_components.as_ptr()
    }

    pub fn polygon_size(&self) -> usize {
        self.polygon_components.len() / 2
    }
}

#[wasm_bindgen]
pub fn rust_memory() -> JsValue {
    wasm_bindgen::memory()
}

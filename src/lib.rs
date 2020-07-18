mod sight;

#[no_mangle]
pub fn hello() {
  println!("hu");
}

#[no_mangle]
pub fn aaa() -> WasmSight {
  WasmSight::new(vec![])
}

#[no_mangle]
pub struct WasmSight {
  sight: sight::Sight,
  polygon: Option<Vec<sight::Point>>,
}

#[no_mangle]
impl WasmSight {
  #[no_mangle]
  pub fn new(segments: Vec<sight::Segment>) -> WasmSight {
    WasmSight {
      sight: sight::Sight::new(segments),
      polygon: None,
    }
  }

  #[no_mangle]
  pub fn generate_polygon(&mut self, source: sight::Point) {
    self.polygon = Some(self.sight.sight_polygon(source))
  }

  #[no_mangle]
  pub fn polygon(&self) -> Option<*const sight::Point> {
    if let Some(polygon) = &self.polygon {
      Some(polygon.as_ptr())
    } else {
      None
    }
  }

  #[no_mangle]
  pub fn polygon_size(&self) -> Option<usize> {
    if let Some(polygon) = &self.polygon {
      Some(polygon.len())
    } else {
      None
    }
  }
}

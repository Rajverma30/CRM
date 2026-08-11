-- 003_functions.sql - Database functions and triggers

-- Calculate total_hours when check_out is set
CREATE OR REPLACE FUNCTION calculate_attendance_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out IS NOT NULL AND NEW.check_in IS NOT NULL THEN
    NEW.total_hours := ROUND(EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_calc_hours
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION calculate_attendance_hours();

-- Auto-set completed_at when task status changes to 'completed'
CREATE OR REPLACE FUNCTION set_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completed_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_at();

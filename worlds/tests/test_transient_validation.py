import math
import unittest

from worlds.simulation.transient_validation import (
    max_absolute_error,
    rc_voltage,
    relative_error,
    rl_current,
)


class AnalyticalTransientValidationTest(unittest.TestCase):
    def test_rc_initial_condition(self):
        self.assertAlmostEqual(rc_voltage(0.0, 1_000.0, 1e-3, 5.0, 1.25), 1.25)

    def test_rc_steady_state(self):
        value = rc_voltage(100.0, 1_000.0, 1e-3, 5.0)
        self.assertAlmostEqual(value, 5.0, places=10)

    def test_rc_time_constant(self):
        # tau = R*C = 1000 * 1e-3 = 1 second.
        value = rc_voltage(1.0, 1_000.0, 1e-3, 5.0)
        self.assertAlmostEqual(value, 5.0 * (1.0 - math.exp(-1.0)), places=12)

    def test_rl_initial_condition(self):
        self.assertAlmostEqual(rl_current(0.0, 10.0, 1e-2, 5.0, 0.125), 0.125)

    def test_rl_steady_state(self):
        value = rl_current(100.0, 10.0, 1e-2, 5.0)
        self.assertAlmostEqual(value, 0.5, places=10)

    def test_rl_time_constant(self):
        value = rl_current(0.001, 10.0, 1e-2, 5.0)
        self.assertAlmostEqual(value, 0.5 * (1.0 - math.exp(-1.0)), places=12)

    def test_max_absolute_error(self):
        self.assertAlmostEqual(max_absolute_error([1.0, 2.0, 4.0], [1.1, 1.5, 4.25]), 0.5)

    def test_max_absolute_error_rejects_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            max_absolute_error([1.0], [1.0, 2.0])

    def test_relative_error(self):
        self.assertAlmostEqual(relative_error(9.0, 10.0), 0.1)

    def test_reference_validation_rejects_invalid_values(self):
        with self.assertRaises(ValueError):
            rc_voltage(0.1, 0.0, 1e-3, 5.0)
        with self.assertRaises(ValueError):
            rl_current(0.1, 10.0, -1e-2, 5.0)


if __name__ == "__main__":
    unittest.main()

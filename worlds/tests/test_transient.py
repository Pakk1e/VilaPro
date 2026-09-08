import unittest

from worlds.simulation.transient import TransientConfiguration, TransientConfigurationError


class TransientConfigurationTest(unittest.TestCase):
    def test_default_grid(self):
        config = TransientConfiguration()
        self.assertEqual(config.time_points(), tuple(round(i * 0.01, 12) for i in range(101)))

    def test_grid_includes_stop(self):
        self.assertEqual(TransientConfiguration(start=0, stop=1, step=0.3).time_points()[-1], 1.0)

    def test_rejects_non_positive_step(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(step=0)

    def test_rejects_reverse_interval(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(start=1, stop=0, step=0.1)

    def test_rejects_excessive_grid(self):
        with self.assertRaises(TransientConfigurationError):
            TransientConfiguration(start=0, stop=100, step=0.001)


if __name__ == "__main__":
    unittest.main()

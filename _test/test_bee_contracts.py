"""Static regression checks for the educational message contracts; no ROS runtime required."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'bee'
DATA = json.loads((ROOT / 'contracts.json').read_text())
EDGES = {edge['id']: edge for edge in DATA['edges']}


class BeeContractTests(unittest.TestCase):
    def test_every_authored_relationship_has_a_unique_explanation(self):
        self.assertEqual(len(EDGES), 195)
        self.assertEqual(len(EDGES), len(DATA['edges']))
        for edge in EDGES.values():
            self.assertIn(edge['from'], DATA['nodes'])
            self.assertIn(edge['to'], DATA['nodes'])
            for key in ('purpose', 'whySeparate', 'receiverDoes'):
                self.assertTrue(edge[key].strip(), (edge['id'], key))
            for channel in edge['channels']:
                self.assertTrue(channel['sources'])
                self.assertTrue(channel['exampleLabel'])

    def test_state_mode_is_a_value_and_emergency_is_boolean(self):
        self.assertEqual(EDGES['e7']['channels'][0]['name'], '/state/operation_mode')
        self.assertEqual(EDGES['e7']['channels'][0]['example'], {'data': 'AUTO'})
        self.assertEqual(EDGES['e8']['channels'][0]['example'], {'data': 'EXPLORE'})
        self.assertIs(EDGES['e70']['channels'][0]['example']['data'], True)

    def test_vlm_receives_rgb_while_perception_also_receives_depth(self):
        channels = EDGES['front-vlm']['channels']
        self.assertEqual(len(channels), 1)
        self.assertEqual(channels[0]['name'], '/pole_front_cam/color/image_raw')
        self.assertEqual(channels[0]['example']['encoding'], 'rgb8')
        self.assertTrue(any('aligned_depth' in channel['name'] for channel in EDGES['e12']['channels']))

    def test_slam_database_is_not_the_grid_save_topic(self):
        self.assertEqual(EDGES['e42']['channels'][0]['kind'], 'file')
        self.assertEqual(EDGES['e163']['channels'][0]['name'], '/map')
        self.assertEqual(EDGES['e163']['channels'][0]['type'], 'nav_msgs/msg/OccupancyGrid')
        grid = EDGES['e163']['channels'][0]['example']
        self.assertEqual(len(grid['data']), grid['info']['width'] * grid['info']['height'])
        self.assertEqual(EDGES['e164']['channels'][0]['example']['request']['map_url'], '/ws/map/default/map')

    def test_custom_message_examples_preserve_array_and_id_contracts(self):
        plan = EDGES['mission-goals']['channels'][0]['example']
        self.assertEqual([goal['step'] for goal in plan['goals']], [1, 2, 3, 4])
        self.assertTrue(all(isinstance(goal['target'], str) for goal in plan['goals']))
        status = EDGES['mission-status']['channels'][0]['example']
        self.assertEqual(set(status), {'plan_id', 'step', 'state', 'reason'})
        self.assertEqual(status['plan_id'], plan['plan_id'])
        signal = EDGES['mission-signal']['channels'][0]['example']
        self.assertEqual(signal['state'], 2)
        self.assertEqual(len(signal['sequence']), 12)
        self.assertEqual(len(signal['onsets']), 12)
        for letter, key in [('R', 'count_r'), ('Y', 'count_y'), ('G', 'count_g')]:
            self.assertEqual(signal['sequence'].count(letter), signal[key])

    def test_planned_and_unknown_contracts_do_not_claim_live_values(self):
        for edge in EDGES.values():
            if edge['id'].startswith('cuv-'):
                self.assertEqual(edge['status'], 'planned')
                self.assertTrue(all('현재 실행값이 아닙니다' in c['note'] for c in edge['channels']))
            for channel in edge['channels']:
                if channel['kind'] == 'reference':
                    self.assertIsNone(channel['example'])
        self.assertIsNone(EDGES['cuv-grid']['channels'][0]['example'])

    def test_original_native_diagram_is_byte_preserved(self):
        self.assertEqual(hashlib.sha256((ROOT / 'diagram.html').read_bytes()).hexdigest(),
                         hashlib.sha256((ROOT / '2026-10-28.html').read_bytes()).hexdigest())
        self.assertIn('iframe', (ROOT / 'index.html').read_text())


if __name__ == '__main__':
    unittest.main()

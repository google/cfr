# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""IO helper functions for JSON."""

import json
from typing import Any


def write_json_to_file(
    filename: str, value: Any, *, human_readable: bool = True
) -> None:
  """Writes JSON data to a utf-8 text file.

  Args:
    filename: The name of the file to write to.
    value: The JSON data to write. This must be a data structure composed of
      dicts with string keys, lists, and scalar values supported in JSON.
    human_readable: When True, the output file will use a human-readable
      formatting with indentation.

  Raises:
    TypeError: When `value` is not JSON-encodeable.
    OSError: When writing to the file fails.
  """
  indent = 2 if human_readable else None
  separators = None if human_readable else (",", ":")
  with open(filename, "wt", encoding="utf-8") as f:
    json.dump(
        value, f, ensure_ascii=False, indent=indent, separators=separators
    )


def read_json_from_file(filename: str) -> Any:
  """Reads JSON data from a file.

  Args:
    filename: The name of the file to read from.

  Returns:
    The JSON data in the native Python format.

  Raises:
    JSONDecodeError: When the input file is not a valid JSON file.
    OSError: When reading the input file fails.
  """
  with open(filename, "rb") as f:
    return json.load(f)

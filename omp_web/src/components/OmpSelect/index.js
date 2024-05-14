import { Select } from "antd";
import { useState, useRef, useEffect } from "react";

const OmpSelect = ({
  searchLoading,
  selectValue,
  listSource,
  setSelectValue,
  fetchData,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState("");

  //select 的onblur函数拿不到最新的search value,使用useref存(是最新的，但是因为失去焦点时会自动触发清空search，还是得使用ref存)
  const searchValueRef = useRef(null);

  useEffect(()=>{
    if(!selectValue){
      searchValueRef.current = "";
      setSearchValue();
    }
  },[selectValue])

  return (
    <Select
      {...props}
      allowClear
      onClear={() => {
        searchValueRef.current = "";
        setSelectValue();
        setSearchValue();
        fetchData();
      }}
      showSearch
      loading={searchLoading}
      style={{ width: 200 }}
      onInputKeyDown={(e) => {
        if (e.code == "Enter") {
          setSelectValue(searchValueRef.current);
          fetchData(searchValueRef.current);
        }
      }}
      searchValue={searchValue}
      onSelect={(e) => {
        if (e == searchValue || !searchValue) {
          setSelectValue(e);
          fetchData(e);
        } else {
          setSelectValue(searchValue);
          fetchData(searchValueRef.current);
        }
        searchValueRef.current = "";
      }}
      value={selectValue}
      onSearch={(e) => {
        e && (searchValueRef.current = e);
        setSearchValue(e);
      }}
      onBlur={(e) => {
        if (searchValueRef.current) {
          setSelectValue(searchValueRef.current);
          fetchData(searchValueRef.current);
        }
      }}
    >
      {listSource.map((item) => {
        return (
          <Select.Option value={item} key={item}>
            {item}
          </Select.Option>
        );
      })}
    </Select>
  );
};

export default OmpSelect;
